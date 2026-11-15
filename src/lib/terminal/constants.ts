/**
 * The shell's own identity. It is not content: the CV names a person, not a
 * user or a host, so these two strings belong to the prompt and nowhere else.
 */
export const PROMPT_USER = "mario";
export const PROMPT_HOST = "portfolio";

/** Absolute path of the virtual filesystem root, which is also home. */
export const HOME_PATH = "/";

/** Bounded so a long session cannot grow without end. */
export const HISTORY_LIMIT = 200;
