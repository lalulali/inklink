/**
 * Feature: Toolbar Component
 * Purpose: Provides access to primary user actions (file, layout, view)
 * Dependencies: shadcn/ui components, lucide-react icons
 */

"use client";

import React from "react";
import { useWebPlatform } from "@/platform/web/web-platform-context";
import { useNotification } from "@/platform/web/web-notification-manager";
import { globalState } from "@/core/state/state-manager";
import { createMarkdownParser } from "@/core/parser/markdown-parser";
import { ColorManager } from "@/core/theme/color-manager";
import { Button } from "@/components/ui/button";
import {
	FolderOpen as FolderOpenIcon,
	Save as SaveIcon,
	Download as DownloadIcon,
	Maximize as MaximizeIcon,
	Minimize as MinimizeIcon,
	RefreshCcw as RefreshCcwIcon,
	Search as SearchIcon,
	Keyboard as KeyboardIcon,
	LayoutGrid as LayoutGridIcon,
	FileText as FileTextIcon,
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Maximize2 as Maximize2Icon,
	MoreHorizontal as MoreHorizontalIcon,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Mind Map Layout Icons
 */
const LTRLayoutIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="6" cy="12" r="2" />
		<path d="M8 12h10" />
		<path d="M12 12c0-3.5 1.5-6 6-6" />
		<path d="M12 12c0 3.5 1.5 6 6 6" />
	</svg>
);

const RTLLayoutIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="18" cy="12" r="2" />
		<path d="M16 12H6" />
		<path d="M12 12c0-3.5-1.5-6-6-6" />
		<path d="M12 12c0 3.5-1.5 6-6 6" />
	</svg>
);

const TwoSidedLayoutIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="12" cy="12" r="2" />
		<path d="M14 12h8" />
		<path d="M16 12c0-3.5 1.5-6 6-6" />
		<path d="M16 12c0 3.5 1.5 6 6 6" />
		<path d="M10 12H2" />
		<path d="M8 12c0-3.5-1.5-6-6-6" />
		<path d="M8 12c0 3.5-1.5 6-6 6" />
	</svg>
);

/**
 * Main application toolbar
 */
export function Toolbar({
	onToggleEditor,
	editorVisible,
}: {
	onToggleEditor: () => void;
	editorVisible: boolean;
}) {
	const { export: exportMgr, factory } = useWebPlatform();
	const { showSuccess, showError, showInfo } = useNotification();
	const [state, setState] = React.useState(globalState.getState());
	const [isMobile, setIsMobile] = React.useState(false);

	React.useEffect(() => {
		return globalState.subscribe((s) => setState(s));
	}, []);

	// Detect mobile to suppress sticky tooltips and collapse secondary tools
	React.useEffect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		setIsMobile(mq.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	const savingRef = React.useRef(false);

	const handleOpen = React.useCallback(async () => {
		try {
			showInfo("Opening file provider...");
			const adapter = factory.createFileSystemAdapter();
			const { content, path, handle } = await adapter.openFile();

			const parser = createMarkdownParser();
			const tree = parser.parse(content);

			// Ensure colors are assigned to the new tree structure
			ColorManager.assignBranchColors(tree);

			globalState.setState({
				markdown: content,
				tree,
				currentFile: { handle: handle as any, path, name: path },
				filePath: path,
				isDirty: false,
				lastSaved: new Date(),
			});

			showSuccess("File opened successfully", `Loaded ${path}`);
		} catch (err: any) {
			if (err.name === "AbortError") return;
			showError("Open failed", err.message || "Unknown error");
		}
	}, [factory, showSuccess, showError, showInfo]);

	const handleSave = React.useCallback(async () => {
		if (savingRef.current) return;

		const s = globalState.getState();
		const content = s.markdown;
		const handle = s.currentFile?.handle;
		const path = s.filePath || "mindmap.md";

		try {
			savingRef.current = true;
			showInfo("Saving file...");
			const adapter = factory.createFileSystemAdapter();
			const result = await adapter.saveFile(content, path, handle);

			if (result.status === "saved") {
				const nextState: any = {
					isDirty: false,
					lastSaved: new Date(),
				};

				if (result.file) {
					nextState.currentFile = result.file.handle;
					nextState.filePath = result.file.path;
					adapter.addRecentFile(result.file.path);
				}

				globalState.setState(nextState);
				showSuccess("File saved successfully");
			} else if (result.status === "error") {
				showError(result.message || "Failed to save file");
			}
			// If 'deferred' or 'cancelled', we don't show success and don't clear isDirty
		} catch (err: any) {
			if (err.name === "AbortError") return;
			showError("Error saving file");
		} finally {
			savingRef.current = false;
		}
	}, [factory, showSuccess, showError, showInfo]);

	React.useEffect(() => {
		window.addEventListener("inklink-file-open", handleOpen);
		window.addEventListener("inklink-file-save", handleSave);
		return () => {
			window.removeEventListener("inklink-file-open", handleOpen);
			window.removeEventListener("inklink-file-save", handleSave);
		};
	}, [handleOpen, handleSave]);

	const handleToggleEditor = () => {
		onToggleEditor();
		// Blur active elements to ensure focus resets properly after UI shift
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	};

	const handleLayoutChange = (val: string) => {
		globalState.setState({ layoutDirection: val as any });
		// Remove focus from the selector trigger after a value is chosen
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	};

	/**
	 * Toggles visibility for all nodes in the tree
	 */
	const handleToggleAllVisibility = (collapsed: boolean) => {
		const s = globalState.getState();
		if (!s.tree) return;

		// Helper to recursively update collapse state
		const recursiveSet = (node: any) => {
			node.collapsed = collapsed;
			if (node.children) {
				node.children.forEach(recursiveSet);
			}
		};

		// Shallow clone of root to satisfy the state manager's reference change requirement
		const newTree = { ...s.tree };
		recursiveSet(newTree);

		globalState.setState({ tree: newTree, isDirty: true });
		showSuccess(`${collapsed ? "Collapsed" : "Expanded"} all nodes`);
	};

	/**
	 * Dispatches find events to the appropriate component based on focus
	 */
	const handleFind = () => {
		const active = document.activeElement;
		const isInEditor = active?.closest(".cm-editor");

		if (isInEditor) {
			window.dispatchEvent(new CustomEvent("inklink-editor-search"));
		} else {
			window.dispatchEvent(new CustomEvent("inklink-toggle-search"));
		}
	};

	return (
		<div
			className="flex h-12 w-full items-center gap-2 border-b bg-background px-4 shadow-sm overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap"
			id="inklink-toolbar"
		>
			{/* On mobile, suppress tooltip delays to avoid stuck overlays */}
			<TooltipProvider delayDuration={isMobile ? 999999 : 300}>
				{/* File Operations */}
				<div className="flex shrink-0 items-center gap-1 border-r pr-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={editorVisible ? "secondary" : "ghost"}
								size="icon"
								className="h-8 w-8"
								onClick={onToggleEditor}
							>
								<FileTextIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{editorVisible ? "Hide Editor" : "Show Editor"}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleOpen}
							>
								<FolderOpenIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Open File (Cmd+O)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleSave}
							>
								<SaveIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Save (Cmd+S)</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0"
								onClick={() =>
									globalState.setState({ isExportDialogOpen: true })
								}
							>
								<DownloadIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Export Mind Map...</TooltipContent>
					</Tooltip>
				</div>

				{/* Tools & Search */}
				<div className="flex shrink-0 items-center gap-1 border-r pr-2 px-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onMouseDown={(e) => {
									e.preventDefault();
									handleFind();
								}}
							>
								<SearchIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Find (Cmd+F)</TooltipContent>
					</Tooltip>
				</div>

				{/* Layout Selector — hidden on mobile, shown in "More" dropdown */}
				<div className="hidden md:flex shrink-0 items-center gap-1 border-r pr-2 px-1">
					<div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1 lg:flex px-1">
						<LayoutGridIcon className="h-3.5 w-3.5" />
					</div>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={
									state.layoutDirection === "two-sided" ? "secondary" : "ghost"
								}
								size="icon"
								className="h-8 w-8"
								onClick={() => handleLayoutChange("two-sided")}
							>
								<TwoSidedLayoutIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Two-Sided Layout</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={
									state.layoutDirection === "left-to-right"
										? "secondary"
										: "ghost"
								}
								size="icon"
								className="h-8 w-8"
								onClick={() => handleLayoutChange("left-to-right")}
							>
								<LTRLayoutIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Left to Right Layout</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={
									state.layoutDirection === "right-to-left"
										? "secondary"
										: "ghost"
								}
								size="icon"
								className="h-8 w-8"
								onClick={() => handleLayoutChange("right-to-left")}
							>
								<RTLLayoutIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Right to Left Layout</TooltipContent>
					</Tooltip>
				</div>

				{/* Visibility Controls — hidden on mobile */}
				<div className="hidden md:flex shrink-0 items-center gap-1 pr-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => handleToggleAllVisibility(false)}
							>
								<MaximizeIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Expand All (E)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => handleToggleAllVisibility(true)}
							>
								<MinimizeIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Collapse All (C)</TooltipContent>
					</Tooltip>
				</div>

				{/* Mobile "More" dropdown — consolidates secondary tools */}
				<div className="flex md:hidden shrink-0 items-center border-r pr-2 px-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontalIcon className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-52">
							{/* Layout options */}
							<DropdownMenuItem
								onClick={() => handleLayoutChange("two-sided")}
								className={state.layoutDirection === "two-sided" ? "bg-muted" : ""}
							>
								<TwoSidedLayoutIcon className="h-4 w-4 mr-2" />
								Two-Sided Layout
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleLayoutChange("left-to-right")}
								className={state.layoutDirection === "left-to-right" ? "bg-muted" : ""}
							>
								<LTRLayoutIcon className="h-4 w-4 mr-2" />
								Left to Right
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleLayoutChange("right-to-left")}
								className={state.layoutDirection === "right-to-left" ? "bg-muted" : ""}
							>
								<RTLLayoutIcon className="h-4 w-4 mr-2" />
								Right to Left
							</DropdownMenuItem>
							{/* Visibility controls */}
							<DropdownMenuItem onClick={() => handleToggleAllVisibility(false)}>
								<MaximizeIcon className="h-4 w-4 mr-2" />
								Expand All
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleToggleAllVisibility(true)}>
								<MinimizeIcon className="h-4 w-4 mr-2" />
								Collapse All
							</DropdownMenuItem>
							{/* Export */}
							<DropdownMenuItem
								onClick={() => globalState.setState({ isExportDialogOpen: true })}
							>
								<DownloadIcon className="h-4 w-4 mr-2" />
								Export Mind Map...
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Help / Theme / Status */}
				<div className="ml-auto flex shrink-0 items-center gap-2 pr-2">
					<ModeToggle />
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => globalState.setState({ isHelpDialogOpen: true })}
							>
								<KeyboardIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Keyboard Reference (?)</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		</div>
	);
}
