/**
 * Feature: Toolbar Component
 * Purpose: Provides access to primary user actions (file, layout, view)
 * Dependencies: shadcn/ui components, lucide-react icons
 */

"use client";

import React from "react";
import { useWebPlatform } from "@/platform/web/web-platform-context";
import { PlatformType } from "@/platform";
import { useNotification } from "@/platform/web/web-notification-manager";
import { globalState } from "@/core/state/state-manager";
import { ChangeLayoutCommand } from "@/core/state/commands/change-layout-command";
import { ToggleAllVisibilityCommand } from "@/core/state/commands/toggle-all-visibility-command";
import { createMarkdownParser } from "@/core/parser/markdown-parser";
import { ColorManager } from "@/core/theme/color-manager";
import { Button } from "@/components/ui/button";
import { cn, getModKey, generateId } from "@/lib/utils";
import {
	FolderOpen as FolderOpenIcon,
	Save as SaveIcon,
	Download as DownloadIcon,
	Maximize as MaximizeIcon,
	Minimize as MinimizeIcon,
	Search as SearchIcon,
	Keyboard as KeyboardIcon,
	LayoutGrid as LayoutGridIcon,
	FileText as FileTextIcon,
	MoreHorizontal as MoreHorizontalIcon,
	Github as GithubIcon,
	Settings as SettingsIcon,
	History as HistoryIcon,
	Undo2 as UndoIcon,
	Redo2 as RedoIcon,
	Map as MapIcon,
	Coffee as CoffeeIcon,
	Zap as ZapIcon,
	HelpCircle as HelpCircleIcon,
	FilePlus as FilePlusIcon,
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
		role="img"
		aria-label="Left to Right Layout"
	>
		<title>Left to Right Layout</title>
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
		role="img"
		aria-label="Right to Left Layout"
	>
		<title>Right to Left Layout</title>
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
	const { factory, autoSave: autoSaveMgr, commands } = useWebPlatform();
	const [modKey, setModKey] = React.useState("Ctrl");
	const isVsCode = factory.getPlatform() === PlatformType.VSCode;
	const { showSuccess, showError, showInfo } = useNotification();
	const [state, setState] = React.useState(globalState.getState());
	const [isMobile, setIsMobile] = React.useState(false);
	const [isNarrow, setIsNarrow] = React.useState(false);
	const isTablet = isMobile && !isNarrow;
	const [canUndo, setCanUndo] = React.useState(false);
	const [canRedo, setCanRedo] = React.useState(false);

	React.useEffect(() => {
		setModKey(getModKey());
		return globalState.subscribe((s) => setState(s));
	}, []);

	// Subscribe to command history changes
	React.useEffect(() => {
		const updateStatus = () => {
			const s = globalState.getState();
			setCanUndo(commands.hasUndo() || s.editorCanUndo);
			setCanRedo(commands.hasRedo() || s.editorCanRedo);
		};

		// Initial check
		updateStatus();

		const unsub = commands.subscribe(updateStatus);
		const unsubState = globalState.subscribe(updateStatus);

		return () => {
			unsub();
			unsubState();
		};
	}, [commands]);

	// Detect mobile and narrow screens
	React.useEffect(() => {
		const mobileMq = window.matchMedia("(max-width: 767px)");
		const narrowMq = window.matchMedia("(max-width: 463px)");
		
		const onChange = () => {
			setIsMobile(mobileMq.matches);
			setIsNarrow(narrowMq.matches);
		};
		
		setIsMobile(mobileMq.matches);
		setIsNarrow(narrowMq.matches);
		
		mobileMq.addEventListener("change", onChange);
		narrowMq.addEventListener("change", onChange);
		return () => {
			mobileMq.removeEventListener("change", onChange);
			narrowMq.removeEventListener("change", onChange);
		};
	}, []);

	const savingRef = React.useRef(false);

	const handleOpen = React.useCallback(async () => {
		try {
			showInfo("Opening file provider...");
			const adapter = factory.createFileSystemAdapter();
			const result = await adapter.openFile();
			const { content, path, handle } = result as {
				content: string;
				path: string;
				handle: any;
			};

			const storage = autoSaveMgr.storage;
			const existingRecord = await storage.findMatchingRecord(
				handle as FileSystemFileHandle,
				path,
			);
			const autoSave = await storage.loadAutoSave(path);

			let finalContent = content;
			if (autoSave && autoSave.markdown !== content) {
				finalContent = autoSave.markdown;
				showInfo(`Restored unsaved changes for ${path}`);
			}

			const parser = createMarkdownParser();
			const tree = parser.parse(finalContent);

			// Ensure colors are assigned to the new tree structure
			ColorManager.assignBranchColors(tree);

			const autoSaveId = existingRecord?.id || generateId();
			globalState.setState({
				markdown: finalContent,
				tree,
				currentFile: { handle: handle as any, path, name: path },
				filePath: path,
				autoSaveId: autoSaveId,
				isDirty: false,
				lastSaved: new Date(),
				lastSaveType: "manual",
			});

			// Trigger immediate local storage save for recovery
			await autoSaveMgr.forceSave(tree, path, autoSaveId);
			console.debug("Open: Local snapshot created immediately");

			// Sync hashes so auto-save manager knows the starting state
			autoSaveMgr.synchronizeHashes(finalContent);

			showSuccess("File opened successfully", `Loaded ${path}`);
		} catch (err) {
			if ((err as Error).name === "AbortError") return;
			showError("Open failed", (err as Error).message || "Unknown error");
		}
	}, [factory, showSuccess, showError, showInfo, autoSaveMgr]);

	const handleSave = React.useCallback(async () => {
		if (savingRef.current) return;

		const s = globalState.getState();
		const content = s.markdown;
		const handle = s.currentFile?.handle;
		const path = s.filePath || "mindmap.md";

		try {
			savingRef.current = true;
			globalState.setState({ isSaving: true });
			showInfo("Saving file...");
			const adapter = factory.createFileSystemAdapter();
			const result = await adapter.saveFile(content, path, handle);

			if (result.status === "saved") {
				const nextState: Partial<typeof state> = {
					isDirty: false,
					lastSaved: new Date(),
					lastSaveType: "manual",
					isSaving: false,
				};

				if (result.file) {
					nextState.currentFile = {
						handle: result.file.handle,
						path: result.file.path,
						name: result.file.path,
					};
					nextState.filePath = result.file.path;
					adapter.addRecentFile(result.file.path);
				}

				globalState.setState(nextState);
				showSuccess("File saved successfully");

				// Sync hashes with auto-save manager to prevent redundant immediate triggers
				autoSaveMgr.synchronizeHashes(content);
			} else if (result.status === "error") {
				globalState.setState({ isSaving: false });
				showError(result.message || "Failed to save file");
			} else {
				// cancelled or deferred
				globalState.setState({ isSaving: false });
			}
		} catch (err) {
			globalState.setState({ isSaving: false });
			if ((err as Error).name === "AbortError") return;
			showError("Error saving file");
		} finally {
			savingRef.current = false;
		}
	}, [factory, showSuccess, showError, showInfo, autoSaveMgr, state]);

	const handleLoadExample = React.useCallback(async () => {
		try {
			showInfo("Loading visualization example...");
			const response = await fetch('/visualization-example.md');
			if (!response.ok) throw new Error('Failed to fetch example file');
			const content = await response.text();

			const newAutoSaveId = generateId();
			globalState.setState({
				markdown: content,
				tree: null,
				currentFile: null,
				filePath: null,
				isDirty: false,
				lastSaved: null,
				lastSaveType: null,
				autoSaveId: newAutoSaveId,
				selectedNode: null,
				searchQuery: '',
				searchResults: [],
				currentSearchIndex: -1,
				isCanvasSearchOpen: false,
				isEditorSearchOpen: false,
				isEditorReplaceOpen: false,
				editorSearchQuery: '',
				editorReplaceQuery: '',
				editorSearchResultsCount: 0,
				editorSearchCurrentIndex: -1,
				editorCanUndo: false,
				editorCanRedo: false,
			});
			// Ensure hashes are synchronized so the manager knows the starting state
			autoSaveMgr.synchronizeHashes(content);

			showSuccess("Example visualization loaded!", "The showcase markdown has been loaded into the editor.");
		} catch (err) {
			showError("Failed to load example", (err as Error).message || "Unknown error");
		}
	}, [autoSaveMgr, editorVisible, onToggleEditor, showInfo, showSuccess, showError]);

	const handleNewDocument = React.useCallback(async () => {
		const newAutoSaveId = generateId();
		globalState.setState({
			markdown: '',
			tree: null,
			currentFile: null,
			filePath: null,
			isDirty: false,
			lastSaved: null,
			lastSaveType: null,
			autoSaveId: newAutoSaveId,
			selectedNode: null,
			searchQuery: '',
			searchResults: [],
			currentSearchIndex: -1,
			isCanvasSearchOpen: false,
			isEditorSearchOpen: false,
			isEditorReplaceOpen: false,
			editorSearchQuery: '',
			editorReplaceQuery: '',
			editorSearchResultsCount: 0,
			editorSearchCurrentIndex: -1,
			editorCanUndo: false,
			editorCanRedo: false,
		});
		autoSaveMgr.synchronizeHashes('');
		// Ensure editor is visible so user can start typing immediately
		if (!editorVisible) {
			onToggleEditor();
		}
		showSuccess("New document created", "Start typing to build your mind map");
	}, [autoSaveMgr, editorVisible, onToggleEditor, showSuccess]);

	React.useEffect(() => {
		window.addEventListener("inklink-file-open", handleOpen);
		window.addEventListener("inklink-file-save", handleSave);
		window.addEventListener("inklink-file-open-example", handleLoadExample);
		window.addEventListener("inklink-file-new", handleNewDocument);
		return () => {
			window.removeEventListener("inklink-file-open", handleOpen);
			window.removeEventListener("inklink-file-save", handleSave);
			window.removeEventListener("inklink-file-open-example", handleLoadExample);
			window.removeEventListener("inklink-file-new", handleNewDocument);
		};
	}, [handleOpen, handleSave, handleLoadExample, handleNewDocument]);

	const handleToggleEditor = React.useCallback(() => {
		onToggleEditor();
		if (
			typeof document !== "undefined" &&
			document.activeElement instanceof HTMLElement
		) {
			document.activeElement.blur();
		}
	}, [onToggleEditor]);

	const autoHideEditor = React.useCallback(() => {
		if (editorVisible && isMobile) {
			onToggleEditor();
		}
	}, [editorVisible, isMobile, onToggleEditor]);

	const handleUndo = () => {
		const s = globalState.getState();
		if (s.editorCanUndo) {
			window.dispatchEvent(new CustomEvent("inklink-editor-undo"));
			return;
		}
		commands.undo();
	};

	const handleRedo = () => {
		const s = globalState.getState();
		if (s.editorCanRedo) {
			window.dispatchEvent(new CustomEvent("inklink-editor-redo"));
			return;
		}
		commands.redo();
	};

	const handleLayoutChange = (val: string) => {
		commands.execute(new ChangeLayoutCommand(val as any, globalState));
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		autoHideEditor();
	};

	const handleToggleAllVisibility = (collapsed: boolean) => {
		commands.execute(new ToggleAllVisibilityCommand(collapsed, globalState));
		showSuccess(`${collapsed ? "Collapsed" : "Expanded"} all nodes`);
		autoHideEditor();
	};

	const handleFind = () => {
		const active = document.activeElement;
		const isInEditor = active?.closest(".cm-editor");
		if (isInEditor) {
			window.dispatchEvent(new CustomEvent("inklink-editor-search"));
		} else {
			window.dispatchEvent(new CustomEvent("inklink-toggle-search"));
			autoHideEditor();
		}
	};

	return (
		<div
			className="flex h-14 w-full items-center gap-2 border-b bg-background px-4 overflow-x-auto no-scrollbar relative z-[70]"
			id="inklink-toolbar"
		>
			<TooltipProvider delayDuration={isMobile ? 999999 : 400}>
				{/* App Branding */}
				<div className="flex shrink-0 items-center gap-2 border-r pr-4">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 1024 1024"
							className="h-5 w-5"
							width="20"
							height="20"
							fill="currentColor"
							role="img"
							aria-label="Inklink Logo"
						>
							<title>Inklink Logo</title>
							<desc>The official logo for the Inklink application.</desc>
							<path
								d="M 197 171.932 C 187.543 174.831, 178.392 182.797, 174.170 191.804 L 171.500 197.500 171.500 462.500 C 171.500 714.562, 171.588 727.915, 173.312 736 C 181.720 775.433, 203.238 807.089, 237.029 829.736 C 247.592 836.815, 257.460 841.559, 270.879 846.007 C 293.528 853.515, 278.387 853.100, 517 852.748 C 716.638 852.454, 730.971 852.319, 737.748 850.676 C 794.031 837.027, 834.469 798.079, 849.330 743.207 L 852.500 731.500 852.500 464.500 L 852.500 197.500 849.591 191.200 C 846.310 184.093, 839.862 177.640, 832.280 173.874 L 827.500 171.500 513.500 171.333 C 340.800 171.241, 198.375 171.510, 197 171.932 M 327 398.965 C 322.325 399.968, 316.250 401.559, 313.500 402.500 C 260.564 420.616, 227.651 475.134, 236.544 529.973 C 243.509 572.921, 272.810 607.386, 314.500 621.667 C 324.707 625.163, 336.745 627.001, 349.381 626.992 C 362.608 626.983, 370.699 625.822, 381.500 622.382 C 420.076 610.096, 448.732 580.859, 459.264 543.043 L 461.500 535.015 512.171 535.008 L 562.841 535 563.490 538.250 C 564.982 545.715, 568.569 555.142, 573.739 565.188 C 593.292 603.177, 632.303 627.020, 674.860 626.992 C 689.445 626.983, 696.673 625.824, 710.259 621.319 C 768.591 601.975, 801.403 539.547, 784.422 480.219 C 781.324 469.397, 772.589 451.464, 766.537 443.500 C 755.154 428.522, 741.167 416.777, 725.500 409.042 C 706.025 399.426, 692.161 396.495, 670 397.306 C 652.237 397.957, 641.599 400.610, 625.500 408.407 C 595.287 423.040, 573.693 448.800, 564.761 480.867 L 562.500 488.985 512 488.985 L 461.500 488.985 459.264 480.957 C 455.864 468.748, 451.519 459.140, 444.742 448.842 C 437.754 438.225, 424.678 424.612, 414.812 417.684 C 401.223 408.141, 382.878 400.647, 366.668 398.016 C 356.790 396.413, 336.646 396.895, 327 398.965 M 334 444.496 C 320.587 447.499, 305.713 456.836, 296.335 468.141 C 275.974 492.684, 276.150 531.501, 296.733 556.226 C 331.443 597.920, 397.570 584.618, 414.677 532.500 C 416.873 525.809, 417.312 522.618, 417.358 513 C 417.424 499.264, 415.773 492.031, 409.885 480.266 C 402.139 464.789, 387.534 452.136, 370.976 446.560 C 360.556 443.051, 344.466 442.153, 334 444.496 M 658.500 444.964 C 644.025 448.797, 634.013 454.814, 624.094 465.639 C 604.113 487.444, 600.655 521.064, 615.724 547 C 627.554 567.362, 651.295 580.965, 675 580.965 C 695.654 580.965, 716.421 570.792, 728.585 554.716 C 738.245 541.948, 742.949 528.057, 742.983 512.197 C 743.063 473.647, 712.575 442.825, 674.590 443.055 C 669.094 443.088, 662.732 443.843, 658.500 444.964"
								fillRule="evenodd"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<div className="hidden flex-col md:flex">
						<span className="text-sm font-bold leading-none tracking-tight">
							INKLINK
						</span>
						<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter opacity-70">
							Studio
						</span>
					</div>
				</div>

				{/* Section 1: Editor & File */}
				<div className="flex shrink-0 items-center gap-1 border-r pr-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={editorVisible ? "secondary" : "ghost"}
								size="icon"
								className="h-8 w-8"
								onClick={handleToggleEditor}
							>
								<FileTextIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{isVsCode
								? "Show Source in Editor"
								: editorVisible
									? "Hide Editor"
									: "Show Editor"}{" "}
							(E)
						</TooltipContent>
					</Tooltip>

					{!isVsCode && !isNarrow && (
						<>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={handleNewDocument}
									>
										<FilePlusIcon className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>New Document ({modKey}+N)</TooltipContent>
							</Tooltip>

							<DropdownMenu>
								<Tooltip>
									<TooltipTrigger asChild>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="h-8 w-8">
												<FolderOpenIcon className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
									</TooltipTrigger>
									<TooltipContent>Open File</TooltipContent>
								</Tooltip>
								<DropdownMenuContent
									align="start"
									className="w-56 border-border bg-background z-[100]"
								>
									<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
										Source Selection
									</div>
									<DropdownMenuItem
										onClick={handleOpen}
										className="gap-2 cursor-pointer"
									>
										<FolderOpenIcon className="h-4 w-4" />
										<span>From Computer ({modKey}+O)</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											globalState.setState({ isRecoveryDialogOpen: true })
										}
										className="gap-2 cursor-pointer"
									>
										<HistoryIcon className="h-4 w-4" />
													<span>From Local Storage ({modKey}+Shift+O)</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

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
								<TooltipContent>Save ({modKey}+S)</TooltipContent>
							</Tooltip>
						</>
					)}

					{!isNarrow && (
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
							<TooltipContent>Export Mind Map ({modKey}+E)</TooltipContent>
						</Tooltip>
					)}
				</div>

				{/* Section 2: History & Search */}
				<div className="flex shrink-0 items-center gap-1 border-r pr-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleUndo}
								disabled={!canUndo}
							>
								<UndoIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							Undo {canUndo ? `(${modKey}+Z)` : "(No actions to undo)"}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleRedo}
								disabled={!canRedo}
							>
								<RedoIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							Redo {canRedo ? `(${modKey}+Shift+Z)` : "(No actions to redo)"}
						</TooltipContent>
					</Tooltip>
					<DropdownMenu>
						<Tooltip>
							<TooltipTrigger asChild>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8">
										<SearchIcon className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
							</TooltipTrigger>
							<TooltipContent>Find</TooltipContent>
						</Tooltip>
						<DropdownMenuContent
							align="start"
							className="w-56 border-border bg-background z-[100]"
						>
							<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
								Search Scope
							</div>
							<DropdownMenuItem
								onClick={() => {
									window.dispatchEvent(new CustomEvent("inklink-toggle-search"));
									autoHideEditor();
								}}
								className="gap-2 cursor-pointer"
							>
								<MapIcon className="h-4 w-4" />
								<span>Find in Mind Map ({modKey}+F)</span>
							</DropdownMenuItem>
							{!isVsCode && (
								<DropdownMenuItem
									onClick={() =>
										window.dispatchEvent(new CustomEvent("inklink-editor-search"))
									}
									className="gap-2 cursor-pointer"
								>
									<FileTextIcon className="h-4 w-4" />
									<span>Find in Editor ({modKey}+Shift+F)</span>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Section 3: Layout — visible at desktop always; also at tablet when in VSCode */}
				<div className={`${isVsCode && isTablet ? 'flex' : 'hidden md:flex'} shrink-0 items-center gap-1 border-r pr-2 px-1`}>
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
						<TooltipContent>Left to Right ({modKey}+←)</TooltipContent>
					</Tooltip>
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
						<TooltipContent>Balance ({modKey}+↑/↓)</TooltipContent>
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
						<TooltipContent>Right to Left ({modKey}+→)</TooltipContent>
					</Tooltip>
				</div>

				{/* Section 4: View & Visibility */}
				<div className="hidden md:flex shrink-0 items-center gap-1 pr-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={!state.minimapVisible ? "ghost" : "secondary"}
								size="icon"
								className="h-8 w-8"
								onClick={() =>
									globalState.setState({
										minimapVisible: !state.minimapVisible,
									})
								}
							>
								<MapIcon className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Toggle Minimap (M)</TooltipContent>
					</Tooltip>
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
						<TooltipContent>Expand All (X)</TooltipContent>
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

				{/* Mobile More Menu */}
				<div className="flex md:hidden shrink-0 items-center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontalIcon className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-52 max-h-[80vh] overflow-y-auto sleek-scrollbar z-[100]">
								<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
									File & History
								</div>
								<DropdownMenuItem onClick={handleNewDocument}>
									<FilePlusIcon className="h-4 w-4 mr-2" />
									New Document
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleOpen}>
									<FolderOpenIcon className="h-4 w-4 mr-2" />
									From Computer 
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => globalState.setState({ isRecoveryDialogOpen: true })}>
									<HistoryIcon className="h-4 w-4 mr-2" />
									From Local Storage ({modKey}+Shift+O)
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleSave}>
									<SaveIcon className="h-4 w-4 mr-2" />
									Save Map ({modKey}+S)
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => globalState.setState({ isExportDialogOpen: true })}>
									<DownloadIcon className="h-4 w-4 mr-2" />
									Export Map ({modKey}+E)
								</DropdownMenuItem>
							<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2 border-t">
								Search
							</div>
							<DropdownMenuItem onClick={() => {
								window.dispatchEvent(new CustomEvent("inklink-toggle-search"));
								autoHideEditor();
							}}>
								<MapIcon className="h-4 w-4 mr-2" />
								<span>Find in Mind Map</span>
							</DropdownMenuItem>
							{!isVsCode && (
								<DropdownMenuItem onClick={() => {
									if (!editorVisible) onToggleEditor();
									window.dispatchEvent(new CustomEvent("inklink-editor-search"));
								}}>
									<FileTextIcon className="h-4 w-4 mr-2" />
									Find in Editor
								</DropdownMenuItem>
							)}
							{/* Layout section: hidden in More menu when VSCode tablet already shows it inline */}
							{!(isVsCode && isTablet) && (
							<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2 border-t">
								Layout
							</div>
							)}
							{!(isVsCode && isTablet) && (
							<>
							<DropdownMenuItem
								onClick={() => handleLayoutChange("left-to-right")}
							>
								<LTRLayoutIcon className="h-4 w-4 mr-2" />
								Left to Right
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleLayoutChange("two-sided")}>
								<TwoSidedLayoutIcon className="h-4 w-4 mr-2" />
								Balance
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleLayoutChange("right-to-left")}
							>
								<RTLLayoutIcon className="h-4 w-4 mr-2" />
								Right to Left
							</DropdownMenuItem>
							</>
							)}
							<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2 border-t">
								View
							</div>
							<DropdownMenuItem
								onClick={() =>
									globalState.setState({
										minimapVisible: !state.minimapVisible,
									})
								}
							>
								<MapIcon className="h-4 w-4 mr-2" />
								{state.minimapVisible ? "Hide Minimap" : "Show Minimap"}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleToggleAllVisibility(false)}
							>
								<MaximizeIcon className="h-4 w-4 mr-2" />
								Expand All
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleToggleAllVisibility(true)}
							>
								<MinimizeIcon className="h-4 w-4 mr-2" />
								Collapse All
							</DropdownMenuItem>
							<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2 border-t">
								App Actions
							</div>
							<DropdownMenuItem
								onClick={() => globalState.setState({ isSettingsDialogOpen: true })}
							>
								<SettingsIcon className="h-4 w-4 mr-2" />
								Settings
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => globalState.setState({ isHelpDialogOpen: true })}
							>
								<KeyboardIcon className="h-4 w-4 mr-2" />
								Keyboard Shortcuts
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => globalState.setState({ isLearnBasicsOpen: true })}
							>
								<HelpCircleIcon className="h-4 w-4 mr-2" />
								Learn the Basics
							</DropdownMenuItem>
							<div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-2 border-t">
								Support & Help
							</div>
							<DropdownMenuItem asChild>
								<a
									href="https://buymeacoffee.com/christianh5"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center w-full"
								>
									<CoffeeIcon className="h-4 w-4 mr-2" />
									Buy me a coffee
								</a>
							</DropdownMenuItem>
							{isVsCode && (
								<DropdownMenuItem asChild>
									<a
										href="https://github.com/ChrisHadi/inklink"
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center w-full"
									>
										<GithubIcon className="h-4 w-4 mr-2" />
										Star on GitHub ⭐
									</a>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Info & Settings */}
				<div className="ml-auto flex shrink-0 items-center gap-2">
					<div className="hidden md:flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
									<a
										href="https://buymeacoffee.com/christianh5"
										target="_blank"
										rel="noopener noreferrer"
									>
										<CoffeeIcon className="h-4 w-4" />
									</a>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Buy me a coffee</TooltipContent>
						</Tooltip>

						{isVsCode && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
										<a
											href="https://github.com/ChrisHadi/inklink"
											target="_blank"
											rel="noopener noreferrer"
										>
											<GithubIcon className="h-4 w-4" />
										</a>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Star on GitHub ⭐</TooltipContent>
							</Tooltip>
						)}
					</div>

					<ModeToggle />
					{!isVsCode && !isNarrow && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() =>
										globalState.setState({ isSettingsDialogOpen: true })
									}
								>
									<SettingsIcon className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Settings</TooltipContent>
						</Tooltip>
					)}
					<div className="hidden md:flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => globalState.setState({ isLearnBasicsOpen: true })}
								>
									<HelpCircleIcon className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>How to use Inklink</TooltipContent>
						</Tooltip>
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
							<TooltipContent>Keyboard Shortcut</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</TooltipProvider>
		</div>
	);
}
