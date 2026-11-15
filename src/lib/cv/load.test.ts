import {
	BASELINE,
	CV_SECTIONS,
	DOCUMENT_ROWS,
	HEADER_ROWS,
	documentOf,
	run
} from "@/test/fixtures/cv";
import { loadCv } from "./load";

const testSubject = loadCv;

/** pdf.js and the network are both external: the extractor is a stub, `fetch` a fake server. */
const extract = vi.hoisted(() => ({ extractCvText: vi.fn() }));

vi.mock("./extract", () => extract);

const ETAG = '"5f3a9c"';
const MOVED_ETAG = '"7b21de"';
const LAST_MODIFIED = "Wed, 21 Oct 2015 07:28:00 GMT";
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const HTTP_OK = 200;
const HTTP_REDIRECT = 300;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
/** The loader's own ceiling on what it will keep in storage. */
const CACHE_LIMIT = 200 * 1024;

/** A published path per test, so one test's in-flight memo is never another's answer. */
function urlFor(name: string): string {
	return `/Portfolio/cv/${name}.pdf`;
}

interface FakeResponse {
	readonly ok: boolean;
	readonly status: number;
	readonly headers: { get(name: string): string | null };
	arrayBuffer(): Promise<ArrayBuffer>;
}

interface ResponseOptions {
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: Uint8Array;
}

/**
 * The body as a real `ArrayBuffer`: a `Uint8Array` only promises its buffer is an
 * `ArrayBufferLike`, while the response the loader awaits is typed to hand back an
 * `ArrayBuffer`, so the bytes are copied into one.
 */
function arrayBufferOf(body: Uint8Array): ArrayBuffer {
	const bytes = new ArrayBuffer(body.byteLength);
	new Uint8Array(bytes).set(body);
	return bytes;
}

function response(
	status: number,
	{ headers = {}, body = PDF_BYTES }: ResponseOptions = {}
): FakeResponse {
	return {
		ok: status >= HTTP_OK && status < HTTP_REDIRECT,
		status,
		headers: { get: name => headers[name] ?? null },
		arrayBuffer: () => Promise.resolve(arrayBufferOf(body))
	};
}

const fetchMock =
	vi.fn<(url: string, init?: { readonly method?: string }) => Promise<FakeResponse>>();

interface Server {
	readonly head?: FakeResponse | (() => Promise<FakeResponse>);
	readonly get?: FakeResponse;
}

/** Routes the loader's two requests: `HEAD` validates, `GET` downloads. */
function serve({ head, get }: Server): void {
	fetchMock.mockImplementation((_url, init) => {
		if (init?.method === "HEAD") {
			if (head === undefined) return Promise.reject(new Error("no route"));
			return typeof head === "function" ? head() : Promise.resolve(head);
		}

		if (get === undefined) return Promise.reject(new Error("no route"));
		return Promise.resolve(get);
	});
}

/** The methods the loader used, in order. */
function methods(): readonly string[] {
	return fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET");
}

interface StorageFaults {
	readonly read?: boolean;
	readonly write?: boolean;
	readonly clear?: boolean;
}

interface FakeStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	readonly key: string | null;
	readonly writes: number;
	readonly removes: number;
	/** Puts a value in place without counting it as the loader's own write. */
	seed(key: string, value: string): void;
	/** What the loader last stored, for seeding a later visit. */
	read(): string | null;
}

function fakeStorage({
	read = false,
	write = false,
	clear = false
}: StorageFaults = {}): FakeStorage {
	const entries = new Map<string, string>();
	let key: string | null = null;
	let writes = 0;
	let removes = 0;

	return {
		get key() {
			return key;
		},
		get writes() {
			return writes;
		},
		get removes() {
			return removes;
		},
		getItem: name => {
			if (read) throw new Error("storage blocked");
			return entries.get(name) ?? null;
		},
		setItem: (name, value) => {
			if (write) throw new Error("quota exceeded");
			entries.set(name, value);
			key = name;
			writes += 1;
		},
		removeItem: name => {
			if (clear) throw new Error("storage blocked");
			entries.delete(name);
			removes += 1;
		},
		seed: (name, value) => entries.set(name, value),
		read: () => (key === null ? null : (entries.get(key) ?? null))
	};
}

let storage: FakeStorage;

beforeEach(() => {
	fetchMock.mockReset();
	extract.extractCvText.mockReset();
	extract.extractCvText.mockResolvedValue(documentOf());
	storage = fakeStorage();
	Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("loadCv", () => {
	it("validates, downloads once and parses the document", async () => {
		serve({
			head: response(HTTP_OK, { headers: { etag: ETAG } }),
			get: response(HTTP_OK)
		});

		const result = await testSubject({ url: urlFor("cold") });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(methods()).toEqual(["HEAD", "GET"]);
		expect(extract.extractCvText).toHaveBeenCalledWith(PDF_BYTES);
		expect(extract.extractCvText).toHaveBeenCalledTimes(1);
		expect(storage.writes).toBe(1);
	});

	it("answers from the cache when the validator has not moved", async () => {
		serve({
			head: response(HTTP_OK, { headers: { etag: ETAG } }),
			get: response(HTTP_OK)
		});
		await testSubject({ url: urlFor("warm-first") });
		const stored = storage.read();
		expect(stored).not.toBeNull();

		const result = await testSubject({ url: urlFor("warm-second") });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(extract.extractCvText).toHaveBeenCalledTimes(1);
		expect(methods()).toEqual(["HEAD", "GET", "HEAD"]);
		expect(storage.writes).toBe(1);
	});

	it("downloads again when the validator has moved", async () => {
		serve({
			head: response(HTTP_OK, { headers: { etag: ETAG } }),
			get: response(HTTP_OK)
		});
		await testSubject({ url: urlFor("moved-first") });

		serve({
			head: response(HTTP_OK, { headers: { etag: MOVED_ETAG } }),
			get: response(HTTP_OK)
		});
		const result = await testSubject({ url: urlFor("moved-second") });

		expect(result.ok).toBe(true);
		expect(extract.extractCvText).toHaveBeenCalledTimes(2);
		expect(storage.writes).toBe(2);
	});

	it("validates by Last-Modified when the server sends no ETag", async () => {
		serve({
			head: response(HTTP_OK, { headers: { "last-modified": LAST_MODIFIED } }),
			get: response(HTTP_OK)
		});
		await testSubject({ url: urlFor("dated-first") });

		const result = await testSubject({ url: urlFor("dated-second") });

		expect(result.ok).toBe(true);
		expect(extract.extractCvText).toHaveBeenCalledTimes(1);
	});

	it("parses without caching when the document cannot be validated", async () => {
		serve({ head: response(HTTP_NOT_FOUND), get: response(HTTP_OK) });

		const first = await testSubject({ url: urlFor("unvalidated-first") });
		const second = await testSubject({ url: urlFor("unvalidated-second") });

		expect(first).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(second).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(extract.extractCvText).toHaveBeenCalledTimes(2);
		expect(storage.writes).toBe(0);
	});

	it("parses without caching when the validator request never lands", async () => {
		serve({ head: () => Promise.reject(new Error("offline")), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("offline") });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(storage.writes).toBe(0);
	});

	it("reports a document that did not arrive", async () => {
		serve({
			head: response(HTTP_OK, { headers: { etag: ETAG } }),
			get: response(HTTP_SERVER_ERROR)
		});

		const result = await testSubject({ url: urlFor("missing") });

		expect(result).toEqual({ ok: false, reason: "cannot fetch cv.pdf: HTTP 500" });
		expect(storage.writes).toBe(0);
	});

	it("reports a document that arrived empty", async () => {
		serve({
			head: response(HTTP_OK, { headers: { etag: ETAG } }),
			get: response(HTTP_OK, { body: new Uint8Array() })
		});

		const result = await testSubject({ url: urlFor("empty") });

		expect(result).toEqual({ ok: false, reason: "cv.pdf is empty" });
	});

	it("reports a document the layout contract refused, with the line", async () => {
		extract.extractCvText.mockResolvedValue(documentOf(HEADER_ROWS));
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("unreadable") });

		expect(result).toEqual({
			ok: false,
			reason: 'missing section "EXPERIENCE"',
			line: "Software Engineer with deep expertise in Web Development and strong interest in AI integrations."
		});
		expect(storage.writes).toBe(0);
	});

	it("reports the error the extractor threw", async () => {
		extract.extractCvText.mockRejectedValue(new Error("worker failed"));
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("worker") });

		expect(result).toEqual({ ok: false, reason: "worker failed" });
	});

	it("reports a failure that is not an Error as its own text", async () => {
		extract.extractCvText.mockRejectedValue("worker failed");
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("string-failure") });

		expect(result).toEqual({ ok: false, reason: "worker failed" });
	});

	it("joins a second caller to the download already in flight", async () => {
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });
		const url = urlFor("inflight");

		const first = testSubject({ url });
		const second = testSubject({ url });

		expect(first).toBe(second);
		expect(await first).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(methods()).toEqual(["HEAD", "GET"]);
		expect(extract.extractCvText).toHaveBeenCalledTimes(1);
	});

	it("starts over after a failure instead of remembering it", async () => {
		serve({
			head: response(HTTP_OK, { headers: { etag: ETAG } }),
			get: response(HTTP_SERVER_ERROR)
		});
		const url = urlFor("retry");

		const failed = await testSubject({ url });

		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });
		const retried = await testSubject({ url });

		expect(failed.ok).toBe(false);
		expect(retried).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(methods()).toEqual(["HEAD", "GET", "HEAD", "GET"]);
	});

	it("skips the cache write when the parsed sections would not fit", async () => {
		const oversized = run("x".repeat(CACHE_LIMIT), 46.8, BASELINE.education - 60, 900);
		extract.extractCvText.mockResolvedValue(documentOf([...DOCUMENT_ROWS, [oversized]]));
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("oversized") });

		expect(result.ok).toBe(true);
		expect(storage.writes).toBe(0);
	});

	it("keeps the document when storage refuses the write", async () => {
		storage = fakeStorage({ write: true });
		Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("quota") });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
	});

	it("re-parses when storage cannot be read", async () => {
		storage = fakeStorage({ read: true, clear: true });
		Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });

		const result = await testSubject({ url: urlFor("blocked") });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(extract.extractCvText).toHaveBeenCalledTimes(1);
	});

	it("re-parses when the stored entry is not JSON", async () => {
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });
		await testSubject({ url: urlFor("corrupt-seed") });
		const key = storage.key;
		expect(key).not.toBeNull();
		if (key !== null) storage.seed(key, "{ not json");

		const result = await testSubject({ url: urlFor("corrupt") });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(extract.extractCvText).toHaveBeenCalledTimes(2);
		expect(storage.removes).toBeGreaterThan(0);
	});
});

interface StoredCase {
	readonly case: string;
	readonly stored: unknown;
}

const storedCases: readonly StoredCase[] = [
	{ case: "a number", stored: 42 },
	{ case: "an empty object", stored: {} },
	{ case: "a key that is not a string", stored: { key: 42, sections: [] } },
	{ case: "sections that are not a list", stored: { key: ETAG, sections: {} } },
	{ case: "a section that is not an object", stored: { key: ETAG, sections: [null] } },
	{ case: "a section with no title", stored: { key: ETAG, sections: [{ body: [] }] } },
	{
		case: "a section whose body is not a list",
		stored: { key: ETAG, sections: [{ title: "Header", body: {} }] }
	},
	{
		case: "a section holding a line that is not text",
		stored: { key: ETAG, sections: [{ title: "Header", body: [42] }] }
	}
];

describe("loadCv stored entries", () => {
	it.each(storedCases)("re-parses and discards $case", async ({ case: name, stored }) => {
		serve({ head: response(HTTP_OK, { headers: { etag: ETAG } }), get: response(HTTP_OK) });
		await testSubject({ url: urlFor(`seed-${name}`) });
		const key = storage.key;
		expect(key).not.toBeNull();
		if (key === null) return;
		storage.seed(key, JSON.stringify(stored));

		const result = await testSubject({ url: urlFor(`entry-${name}`) });

		expect(result).toEqual({ ok: true, sections: CV_SECTIONS });
		expect(extract.extractCvText).toHaveBeenCalledTimes(2);
		expect(storage.removes).toBeGreaterThan(0);
	});
});
