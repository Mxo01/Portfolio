import { beforeEach, describe, expect, it } from "vitest";
import { TabContentComponent } from "./tab-content.component";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MockComponent, MockProvider } from "ng-mocks";
import { MilestoneComponent } from "../milestone/milestone.component";
import { Skeleton } from "primeng/skeleton";
import { EmptyListComponent } from "../empty-list/empty-list.component";
import { StateService } from "../../services/state/state.service";
import { signal } from "@angular/core";

describe("TabContentComponent", () => {
	let component: TabContentComponent;
	let fixture: ComponentFixture<TabContentComponent>;

	let mockStateService: StateService;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				TabContentComponent,
				MockComponent(MilestoneComponent),
				MockComponent(EmptyListComponent),
				MockComponent(Skeleton)
			],
			providers: [
				MockProvider(StateService, {
					tabAnimationDirection: signal<"left" | "right">("left")
				})
			]
		}).compileComponents();

		fixture = TestBed.createComponent(TabContentComponent);
		component = fixture.componentInstance;

		mockStateService = TestBed.inject(StateService);

		fixture.componentRef.setInput("milestones", []);
		fixture.componentRef.setInput("emptyTitle", "Empty title");
		fixture.componentRef.setInput("emptyDescription", "Empty description");
		fixture.componentRef.setInput("isLoading", true);
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});

	it.each(["left", "right"])(
		"should update tabAnimationDirection when it changes on the state service",
		direction => {
			// WHEN
			mockStateService.tabAnimationDirection.set(direction as "left" | "right");

			// THEN
			expect(component.tabAnimationDirection()).toBe(direction);
		}
	);
});
