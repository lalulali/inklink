/**
 * Feature: Markdown Editor (CodeMirror)
 * Purpose: Provides a professional code-editor experience for markdown with syntax highlighting
 * Dependencies: @uiw/react-codemirror, @codemirror/lang-markdown, globalState
 */

"use client";

import React from "react";
import CodeMirror, {
	EditorView,
	keymap,
	Decoration,
	DecorationSet,
	ViewUpdate,
	ViewPlugin,
} from "@uiw/react-codemirror";
import { 
	autocompletion, 
	CompletionContext, 
	acceptCompletion, 
	completionStatus,
	startCompletion
} from "@codemirror/autocomplete";
import { Prec, EditorSelection, RangeSetBuilder, Transaction } from "@codemirror/state";
import { markdown as mdLang } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { indentWithTab, indentMore, indentLess, undoDepth, redoDepth, undo, redo } from "@codemirror/commands";
import { ChevronLeft, ChevronRight, X, ExternalLink, Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { globalState } from "@/core/state/state-manager";
import { createMarkdownParser } from "@/core/parser/markdown-parser";
import { ColorManager } from "@/core/theme/color-manager";
import { getRandomFunWord } from "@/core/constants/branding";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { search, getSearchQuery, findNext } from "@codemirror/search";
import { MarkdownSearchPanel } from "./markdown-search-panel";
import { useFileDrop } from "@/hooks/use-file-drop";
import { useWebPlatform } from "@/platform/web/web-platform-context";

// Custom theme to match Inklink aesthetic
const inklinkTheme = EditorView.theme({
	"&": {
		height: "100%",
		fontSize: "14px",
		backgroundColor: "transparent !important",
		outline: "none !important",
	},
	"&.cm-focused": {
		outline: "none !important",
	},
	".cm-content": {
		fontFamily:
			"var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
		padding: "0.5rem",
	},
	"&.cm-focused .cm-cursor": {
		borderLeftColor: "hsl(var(--primary))",
	},
	".cm-gutters": {
		backgroundColor: "transparent !important",
		border: "none !important",
		color: "#6b7280", // text-muted-foreground
		userSelect: "none",
	},
	".cm-activeLineGutter": {
		backgroundColor: "transparent !important",
	},
	".cm-foldGutter": {
		padding: "0 4px",
		opacity: "0.5",
		transition: "opacity 0.2s",
	},
	".cm-foldGutter:hover": {
		opacity: "1",
	},
	".cm-foldPlaceholder": {
		backgroundColor: "transparent",
		border: "none",
		color: "hsl(var(--primary))",
		padding: "0 4px",
	},
	"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
		{
			backgroundColor: "hsl(var(--primary) / 0.4) !important",
		},
	".cm-activeLine": {
		backgroundColor: "transparent !important",
	},
	".cm-searchMatch": {
		backgroundColor: "#ffd33d66 !important", // VS Code Yellow
		border: "1px solid #ffd33d88",
	},
	".cm-searchMatch.cm-searchMatch-selected": {
		backgroundColor: "#f97316 !important", // More amber for focus
	},
});

// Colorful light mode highlighting (OneDark inspired)
const lightColorfulHighlightStyle = HighlightStyle.define([
	{ tag: t.heading1, color: "#e45649", fontWeight: "bold" },
	{ tag: t.heading2, color: "#d19a66", fontWeight: "bold" },
	{ tag: t.heading3, color: "#986801", fontWeight: "bold" },
	{ tag: [t.keyword, t.operator, t.typeName], color: "#a626a4" },
	{ tag: [t.string, t.meta, t.regexp], color: "#50a14f" },
	{ tag: [t.variableName, t.propertyName], color: "#4078f2" },
	{ tag: [t.className, t.constant(t.variableName)], color: "#986801" },
	{ tag: t.comment, color: "#a0a1a7", fontStyle: "italic" },
	{ tag: t.strong, fontWeight: "bold" },
	{ tag: t.emphasis, fontStyle: "italic" },
	{ tag: t.link, color: "#4078f2", textDecoration: "underline" },
	{ tag: t.url, color: "#0184bc" },
	{ tag: t.monospace, color: "#50a14f" },
]);

/* --- HTML Tag Autocomplete & Sync Features --- */

const EXTENDED_HTML_TAG_INFO: Record<string, string> = {
	"a": "link",
	"br": "line break",
	"sub": "subscript",
	"sup": "superscript",
	"kbd": "keyboard key",
	"details": "collapsible",
	"summary": "toggle label",
	"mark": "highlight",
	"u": "underline",
	"div": "container",
	"span": "wrapper",
	"p": "paragraph",
	"center": "center align",
	"ul": "bullet list",
	"li": "list item",
	"ol": "ordered list",
	"em": "italic",
	"i": "italic",
	"strong": "bold text",
	"b": "bold text",
	"image": "image tag",
	"img": "image tag"
};

/**
 * Custom HTML tag completion source limited to specific extended tags
 */
function htmlTagCompletionSource(context: CompletionContext) {
	// Trigger on < and </ followed by optional letters
	let word = context.matchBefore(/<\/?[a-zA-Z]*/);
	
	// If no match found, don't trigger
	if (!word) return null;
	
	// If the match is empty and it wasn't an explicit trigger (like Ctrl+Space), don't show
	if (word.from === word.to && !context.explicit) return null;
	
	// If the match is just "<" or "</", we want to show all options
	const isClosing = word.text.startsWith('</');
	const options = Object.keys(EXTENDED_HTML_TAG_INFO).map(tag => ({ 
		label: `${tag} - ${EXTENDED_HTML_TAG_INFO[tag]}`, 
		type: "tag",
		apply: isClosing ? tag + ">" : (tag === "br" ? tag + ">" : 
			(tag === "a" ? 'a href="">' : 
			((tag === "img" || tag === "image") ? tag + ' src="">' : tag + ">")))
	}));

	return {
		from: word.from + (isClosing ? 2 : 1),
		options: options,
		validFor: /^[a-zA-Z]*$/,
		filter: true
	};
}

/**
 * Synchronized HTML Tags Plugin
 * Monitors changes to opening/closing tags and updates their counterparts
 */
const syncTagsPlugin = ViewPlugin.fromClass(class {
	update(update: ViewUpdate) {
		if (!update.docChanged || update.transactions.some(tr => tr.annotation(Transaction.userEvent) === "sync")) return;
		
		let changes: { from: number; to: number; insert: string }[] = [];
		const state = update.state;

		update.changes.iterChanges((fromA, toA, fromB, toB) => {
			const tree = syntaxTree(state);
			let node = tree.resolveInner(toB, -1);
			
			// Find TagName node
			while (node && node.name !== "TagName" && node.parent) {
				node = node.parent;
			}
			
			if (node && node.name === "TagName") {
				const tag = node.parent;
				if (tag && (tag.name === "OpenTag" || tag.name === "CloseTag")) {
					const element = tag.parent;
					if (element) {
						const other = tag.name === "OpenTag" ? element.getChild("CloseTag") : element.getChild("OpenTag");
						if (other) {
							const otherName = other.getChild("TagName");
							if (otherName) {
								const newName = state.sliceDoc(node.from, node.to);
								if (state.sliceDoc(otherName.from, otherName.to) !== newName) {
									changes.push({ from: otherName.from, to: otherName.to, insert: newName });
								}
							}
						}
					}
				}
			}
		});

		if (changes.length > 0) {
			update.view.dispatch({
				changes,
				annotations: Transaction.userEvent.of("sync")
			});
		}
	}
});

/**
 * Tab-to-Accept Completion Keymap
 */
const autocompleteTabKeymap = Prec.highest(keymap.of([
	{
		key: "Tab",
		run: (view) => {
			if (completionStatus(view.state) === "active") {
				return acceptCompletion(view);
			}
			return false;
		}
	}
]));

/* --- Link Popover Components --- */

function LinkPopover({ url, onClose }: { url: string; onClose?: () => void }) {
	const [copied, setCopied] = React.useState(false);

	const handleCopy = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleOpen = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// Ensure URL has protocol
		const href = url.match(/^[a-z]+:\/\//i) ? url : `https://${url}`;
		window.open(href, "_blank", "noopener,noreferrer");
		onClose?.();
	};

	return (
		<div className="flex items-center gap-1 p-1.5 bg-popover border border-border rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto backdrop-blur-md min-w-[120px]">
			<div className="px-2 py-1 text-[10px] max-w-[150px] truncate text-muted-foreground font-mono bg-muted/50 rounded-md mr-1 border border-border/20">
				{url}
			</div>
			<div className="flex items-center gap-0.5">
				<Button 
					variant="ghost" 
					size="icon" 
					className="h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all rounded-md"
					onClick={handleOpen}
					title="Open Link"
				>
					<ExternalLink className="h-3.5 w-3.5" />
				</Button>
				<Button 
					variant="ghost" 
					size="icon" 
					className="h-7 w-7 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all rounded-md"
					onClick={handleCopy}
					title="Copy Link"
				>
					{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
				</Button>
			</div>
		</div>
	);
}

function getLinkAt(state: any, pos: number) {
	const tree = syntaxTree(state);
	let node = tree.resolveInner(pos, -1);
	
	// Handle URL nodes directly
	if (node.name === "URL" || node.name === "Url") {
		return {
			url: state.sliceDoc(node.from, node.to),
			from: node.from,
			to: node.to
		};
	}

	// Walk up to find Link
	let curr = node;
	while (curr && curr.name !== "Document") {
		if (curr.name === "Link") {
			const urlNode = curr.getChild("URL") || curr.getChild("Url");
			if (urlNode) {
				return {
					url: state.sliceDoc(urlNode.from, urlNode.to),
					from: curr.from,
					to: curr.to
				};
			}
		}
		curr = curr.parent!;
	}

	return null;
}

const revealHighlightStyle = Decoration.mark({ 
	attributes: { 
		style: "background-color: rgba(255, 230, 0, 0.3); border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 2px;" 
	} 
});

export function MarkdownEditor({ onClose }: { onClose?: () => void }) {
	const [state, setState] = React.useState(globalState.getState());
	const [value, setValue] = React.useState(state.markdown);
	const { resolvedTheme } = useTheme();
	const parser = React.useMemo(() => createMarkdownParser(), []);
	const editorRef = React.useRef<any>(null);
	const [editorView, setEditorView] = React.useState<EditorView | null>(null);
	const [revealHighlight, setRevealHighlight] = React.useState<{ from: number; to: number } | null>(null);
	const [activeLink, setActiveLink] = React.useState<{ url: string; x: number; y: number } | null>(null);
	const { autoSave } = useWebPlatform();
	const isDark = resolvedTheme === "dark";

	// Function to update search counts and index based on current editor state
	const updateSearchStats = React.useCallback((view: EditorView) => {
		const { state: editorState } = view;
		const s = globalState.getState();
		const queryStr = s.editorSearchQuery;

		if (!queryStr) {
			globalState.setState({
				editorSearchResultsCount: 0,
				editorSearchCurrentIndex: -1,
			});
			return { count: 0, currentIndex: -1, firstMatch: null };
		}

		const docText = editorState.doc.toString();
		const matches: { from: number; to: number }[] = [];

		try {
			if (s.editorSearchRegex) {
				const flags = s.editorSearchCaseSensitive ? "g" : "gi";
				const re = new RegExp(queryStr, flags);
				let match;
				while ((match = re.exec(docText)) !== null) {
					matches.push({
						from: match.index,
						to: match.index + match[0].length,
					});
					if (match.index === re.lastIndex) re.lastIndex++; // Prevent infinite loops
				}
			} else {
				const searchLower = s.editorSearchCaseSensitive
					? queryStr
					: queryStr.toLowerCase();
				const textLower = s.editorSearchCaseSensitive
					? docText
					: docText.toLowerCase();
				let pos = 0;
				while ((pos = textLower.indexOf(searchLower, pos)) !== -1) {
					matches.push({ from: pos, to: pos + searchLower.length });
					pos += 1; // OVERLAPPING SEARCH: Only move 1 char forward
				}
			}
		} catch (e) {
			// Invalid regex, etc.
		}

		let currentIndex = -1;
		const selection = editorState.selection.main;

		matches.forEach((match, idx) => {
			if (match.from === selection.from && match.to === selection.to) {
				currentIndex = idx;
			}
		});

		globalState.setState({
			editorSearchResultsCount: matches.length,
			editorSearchCurrentIndex: currentIndex,
		});
		return {
			count: matches.length,
			currentIndex,
			firstMatch: matches[0] || null,
		};
	}, []);

	// Update counts whenever editor query or modifiers change
	React.useEffect(() => {
		if (editorView) {
			const { count, currentIndex, firstMatch } = updateSearchStats(editorView);

			// Auto-jump to nearest match if the current selection is no longer valid
			if (
				state.isEditorSearchOpen &&
				state.editorSearchQuery &&
				currentIndex === -1 &&
				count > 0 &&
				firstMatch
			) {
				editorView.dispatch({
					selection: { anchor: firstMatch.from, head: firstMatch.to },
					scrollIntoView: true,
					userEvent: "select.search",
				});
			}
		}
	}, [
		editorView,
		state.editorSearchQuery,
		state.editorSearchCaseSensitive,
		state.editorSearchWholeWord,
		state.editorSearchRegex,
		state.isEditorSearchOpen,
		updateSearchStats,
	]);

	const searchHighlightStyle = Decoration.mark({ class: "cm-searchMatch" });

	const searchHighlightPlugin = React.useMemo(
		() =>
			ViewPlugin.fromClass(
				class {
					decorations: DecorationSet;

					constructor(view: EditorView) {
						this.decorations = this.getDecorations(view);
					}

					update(update: ViewUpdate) {
						if (
							update.docChanged ||
							update.selectionSet ||
							update.transactions.length > 0
						) {
							this.decorations = this.getDecorations(update.view);
						}
					}

					getDecorations(view: EditorView) {
						const s = globalState.getState();
						const queryStr = s.editorSearchQuery;
						if (!queryStr) return Decoration.none;

						const docText = view.state.doc.toString();
						const builder = new RangeSetBuilder<Decoration>();
						const selection = view.state.selection.main;

						const addMatch = (from: number, to: number) => {
							if (from === selection.from && to === selection.to) return;
							builder.add(from, to, searchHighlightStyle);
						};

						try {
							if (s.editorSearchRegex) {
								const flags = s.editorSearchCaseSensitive ? "g" : "gi";
								const re = new RegExp(queryStr, flags);
								let match;
								while ((match = re.exec(docText)) !== null) {
									addMatch(match.index, match.index + match[0].length);
									if (match.index === re.lastIndex) re.lastIndex++;
								}
							} else {
								const searchLower = s.editorSearchCaseSensitive
									? queryStr
									: queryStr.toLowerCase();
								const textLower = s.editorSearchCaseSensitive
									? docText
									: docText.toLowerCase();
								let pos = 0;
								while ((pos = textLower.indexOf(searchLower, pos)) !== -1) {
									addMatch(pos, pos + searchLower.length);
									pos += 1;
								}
							}
						} catch (e) {}

						return builder.finish();
					}
				},
				{
					decorations: (v) => v.decorations,
				},
			),
		[],
	);

	const revealHighlightPlugin = React.useMemo(
		() =>
			ViewPlugin.fromClass(
				class {
					decorations: DecorationSet;
					constructor(view: EditorView) { this.decorations = this.getDecorations(); }
					update(update: ViewUpdate) { this.decorations = this.getDecorations(); }
					getDecorations() {
						if (!revealHighlight) return Decoration.none;
						const builder = new RangeSetBuilder<Decoration>();
						builder.add(revealHighlight.from, revealHighlight.to, revealHighlightStyle);
						return builder.finish();
					}
				},
				{ decorations: v => v.decorations }
			),
		[revealHighlight]
	);

	const lastSentMarkdownRef = React.useRef(state.markdown);

	React.useEffect(() => {
		return globalState.subscribe((nextState) => {
			// Sub-select only relevant state to avoid re-rendering on transform/canvas changes
			const relevantFields = [
				"markdown",
				"editorSearchQuery",
				"editorSearchCaseSensitive",
				"editorSearchWholeWord",
				"editorSearchRegex",
				"isEditorSearchOpen",
				"isEditorReplaceOpen",
				"editorSearchCurrentIndex",
				"editorSearchResultsCount",
			] as const;

			const hasChanged = relevantFields.some(
				(field) => nextState[field] !== state[field],
			);

			if (hasChanged) {
				setState(nextState);
			}

			// Independent logic for external markdown sync
			const isFromMe = nextState.markdown === lastSentMarkdownRef.current;
			if (!isFromMe) {
				const currentDoc = (editorRef.current as any)?.view?.state.doc.toString();
				if (nextState.markdown !== currentDoc) {
					setValue(nextState.markdown);
					lastSentMarkdownRef.current = nextState.markdown;
				}
			}
		});
	}, [state]); // Include state in deps for comparison

	const wasMultiRootRef = React.useRef(false);
	const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

	/**
	 * Helper to sync collapsed states from old tree to new tree
	 */
	const syncCollapsedStates = (oldTree: any, newTree: any) => {
		if (!oldTree || !newTree) return;

		// 1. Build a map of existing states (collapsed nodes + expanded code/quote/table blocks)
		const states = new Map<string, { collapsed: boolean; codeBlocks?: boolean[]; quoteBlocks?: boolean[]; tableBlocks?: boolean[] }>();
		const traverseOld = (n: any) => {
			states.set(n.id, {
				collapsed: n.collapsed,
				codeBlocks: n.metadata?.codeBlocks?.map((b: any) => b.expanded),
				quoteBlocks: n.metadata?.quoteBlocks?.map((b: any) => b.expanded),
				tableBlocks: n.metadata?.tableBlocks?.map((b: any) => b.expanded),
			});
			n.children?.forEach(traverseOld);
		};
		traverseOld(oldTree);

		// 2. Apply to new tree
		const traverseNew = (n: any) => {
			if (states.has(n.id)) {
				const oldState = states.get(n.id)!;
				n.collapsed = oldState.collapsed;

				// Sync code blocks expansion
				if (oldState.codeBlocks && n.metadata?.codeBlocks) {
					n.metadata.codeBlocks.forEach((b: any, i: number) => {
						if (oldState.codeBlocks![i] !== undefined) {
							b.expanded = oldState.codeBlocks![i];
						}
					});
				}

				// Sync quote blocks expansion
				if (oldState.quoteBlocks && n.metadata?.quoteBlocks) {
					n.metadata.quoteBlocks.forEach((b: any, i: number) => {
						if (oldState.quoteBlocks![i] !== undefined) {
							b.expanded = oldState.quoteBlocks![i];
						}
					});
				}

				// Sync table blocks expansion
				if (oldState.tableBlocks && n.metadata?.tableBlocks) {
					n.metadata.tableBlocks.forEach((b: any, i: number) => {
						if (oldState.tableBlocks![i] !== undefined) {
							b.expanded = oldState.tableBlocks![i];
						}
					});
				}
			}
			n.children?.forEach(traverseNew);
		};
		traverseNew(newTree);
	};

	/**
	 * Helper to ensurefocused node's path is expanded
	 */
	const expandPathToLine = (root: any, lineIndex: number) => {
		const targetId = `line_${lineIndex}`;
		const expand = (n: any): boolean => {
			if (n.id === targetId) return true;
			if (!n.children) return false;

			let found = false;
			for (const child of n.children) {
				if (expand(child)) {
					found = true;
					break;
				}
			}

			if (found) {
				n.collapsed = false;
			}
			return found;
		};
		expand(root);
	};

	const processUpdate = React.useCallback(
		(val: string) => {
			lastSentMarkdownRef.current = val;
			try {
				const state = globalState.getState();
				const effectivelyEmpty =
					val
						.split("\n")
						.map((line) => line.trim().replace(/^(#+|-|\*|\+|\d+\.)\s*/, ""))
						.join("")
						.trim().length === 0;

				if (effectivelyEmpty) {
					globalState.setState({ markdown: val, tree: null, isDirty: true });
					wasMultiRootRef.current = false;
					return;
				}

				const fileName = state.currentFile?.name?.replace(/\.[^/.]+$/, "");

				// Parse new tree
				let tree = parser.parse(val, fileName || state.currentFallbackRootName);
				const isMultiRoot = tree.id === "virtual_root";

				// PRESERVE COLLAPSED STATES
				if (state.tree) {
					syncCollapsedStates(state.tree, tree);
				}

				// ENSURE FOCUSED NODE IS VISIBLE
				if (editorRef.current?.view) {
					const head = editorRef.current.view.state.selection.main.head;
					const line = editorRef.current.view.state.doc.lineAt(head);
					expandPathToLine(tree, line.number - 1);
				}

				// If we just became multi-root and have no filename, pick a NEW fun word
				if (isMultiRoot && !wasMultiRootRef.current && !fileName) {
					const newName = getRandomFunWord();
					// Re-parse with the new name for immediate effect
					tree = parser.parse(val, newName);

					// Re-apply states to the newly parsed multi-root tree
					if (state.tree) syncCollapsedStates(state.tree, tree);
					if (editorRef.current?.view) {
						const head = editorRef.current.view.state.selection.main.head;
						const line = editorRef.current.view.state.doc.lineAt(head);
						expandPathToLine(tree, line.number - 1);
					}

					globalState.setState({
						markdown: val,
						tree,
						isDirty: true,
						currentFallbackRootName: newName,
					});
				} else {
					lastSentMarkdownRef.current = val;
					globalState.setState({ markdown: val, tree, isDirty: true });
				}

				wasMultiRootRef.current = isMultiRoot;
				ColorManager.assignBranchColors(tree);
			} catch (err) {
				globalState.setState({ markdown: val, tree: null, isDirty: true });
				wasMultiRootRef.current = false;
			}
		},
		[parser],
	);

	const lastParseTimeRef = React.useRef<number>(0);

	const onChange = React.useCallback(
		(val: string) => {
			setValue(val);
			if (revealHighlight) setRevealHighlight(null);

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			const now = Date.now();
			// Immediate parse if it's been more than 500ms since last parse (start of typing)
			if (now - lastParseTimeRef.current > 500) {
				processUpdate(val);
				lastParseTimeRef.current = now;
			} else {
				debounceTimerRef.current = setTimeout(() => {
					processUpdate(val);
					lastParseTimeRef.current = Date.now();
				}, 50); // Aggressive 50ms debounce for near real-time feel
			}
		},
		[processUpdate],
	);

	// Handle programmatic reveals (from canvas double click)
	React.useEffect(() => {
		const handleReveal = (e: any) => {
			const { content, nodeId } = e.detail;
			if (!editorRef.current?.view) return;

			const view = editorRef.current.view;
			const state = view.state;

			// Attempt 1: If ID is in "line_N" format, jump directly to line
			if (nodeId && nodeId.startsWith("line_")) {
				const lineIdx = parseInt(nodeId.replace("line_", ""));
				// CodeMirror lines are 1-based
				const lineNum = lineIdx + 1;

				if (lineNum <= state.doc.lines) {
					try {
						const line = state.doc.line(lineNum);
						
						// Detect bullet points and markers to exclude them from the highlight if needed
						const lineMatch = line.text.match(/^(\s*([-*+]|\d+\.)\s*(\[[ xX]\])?\s*)/);
						const prefixLength = lineMatch ? lineMatch[0].length : 0;

						// Highlight the content portion found in the node (or the whole line if empty)
						const findIndex = line.text.indexOf(content);
						const highlightFrom = findIndex !== -1 ? line.from + findIndex : line.from + prefixLength;
						const highlightTo = findIndex !== -1 ? highlightFrom + content.length : line.to;

						// Put cursor at the end of the line
						const cursorPosition = line.to;

						view.dispatch({
							selection: { anchor: cursorPosition, head: cursorPosition },
							effects: [EditorView.scrollIntoView(cursorPosition, { y: 'start', yMargin: 20 })],
							userEvent: "select.reveal",
						});

						// Trigger persistent highlight (will clear on typing or cursor move)
						setRevealHighlight({ from: highlightFrom, to: highlightTo });

						view.focus();
						return;
					} catch (e) {
						console.error("Failed to jump to line by index:", e);
					}
				}
			}

			// Attempt 2: Fallback to global string search if index is invalid or virtual
			const doc = state.doc.toString();
			const index = doc.indexOf(content);
			if (index !== -1) {
				view.dispatch({
					selection: { anchor: index, head: index + content.length },
					effects: [EditorView.scrollIntoView(index, { y: 'start', yMargin: 20 })],
					userEvent: "select.reveal",
				});
				setRevealHighlight({ from: index, to: index + content.length });
				view.focus();
			}
		};

		const handleClear = () => {
			setRevealHighlight(null);
		};

		window.addEventListener("inklink-editor-reveal", handleReveal);
		window.addEventListener("inklink-editor-clear-highlight", handleClear);

		return () => {
			window.removeEventListener("inklink-editor-reveal", handleReveal);
			window.removeEventListener("inklink-editor-clear-highlight", handleClear);
		};
	}, []);

	// Handle quick-action inserts fired from the mobile markdown toolbar
	React.useEffect(() => {
		const handleInsert = (e: Event) => {
			const { insert, cursorOffset } = (e as CustomEvent<{ insert: string; cursorOffset?: number }>).detail;
			if (!editorView) return;

			const { state } = editorView;
			const main = state.selection.main;

			editorView.dispatch({
				changes: { from: main.from, to: main.to, insert },
				selection: {
					anchor: cursorOffset !== undefined
						? main.from + cursorOffset
						: main.from + insert.length,
				},
				scrollIntoView: true,
			});
			editorView.focus();
		};

		window.addEventListener('inklink-editor-insert', handleInsert);
		return () => window.removeEventListener('inklink-editor-insert', handleInsert);
	}, [editorView]);

	// Handle "Select All Matches" (Alt+Enter) from search panel
	React.useEffect(() => {
		const handleSelectAll = () => {
			if (!editorView) return;
			const { state } = editorView;
			const query = getSearchQuery(state);
			if (!query || query.search === "") return;

			const cursor = query.getCursor(state.doc);
			const ranges = [];

			while (true) {
				const { done, value } = cursor.next();
				if (done) break;
				ranges.push(EditorSelection.range(value.from, value.to));
			}

			if (ranges.length > 0) {
				editorView.dispatch({
					selection: EditorSelection.create(ranges),
					scrollIntoView: true,
				});
				editorView.focus();
			}
		};

		window.addEventListener(
			"inklink-editor-select-all-search",
			handleSelectAll,
		);
		return () =>
			window.removeEventListener(
				"inklink-editor-select-all-search",
				handleSelectAll,
			);
	}, [editorView]);

	React.useEffect(() => {
		const handleUndo = () => {
			if (!editorView) return;
			undo(editorView);
			editorView.focus();
		};
		const handleRedo = () => {
			if (!editorView) return;
			redo(editorView);
			editorView.focus();
		};

		window.addEventListener("inklink-editor-undo", handleUndo);
		window.addEventListener("inklink-editor-redo", handleRedo);
		return () => {
			window.removeEventListener("inklink-editor-undo", handleUndo);
			window.removeEventListener("inklink-editor-redo", handleRedo);
		};
	}, [editorView]);

	// Clean up timer on unmount
	React.useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	// Handle clicking on the empty area of the editor to focus it
	const handleContainerClick = () => {
		if (editorRef.current?.view) {
			editorRef.current.view.focus();
		}
	};

	// Keymap for "Linter Level" behaviors
	const customKeymap = keymap.of([
		{
			key: "Mod-b",
			run: (view) => {
				const { state } = view;
				let main = state.selection.main;
				const tree = syntaxTree(state);

				// 1. Try to find a StrongEmphasis node wrapping the selection
				let boldNode: any = null;
				let cur: any = tree.resolveInner(main.head, -1);
				while (cur && cur.name !== "Document") {
					if (cur.name === "StrongEmphasis") {
						boldNode = cur;
						break;
					}
					cur = cur.parent;
				}

				if (boldNode) {
					// Toggle OFF: Remove markers of the identified node
					const from = boldNode.from, to = boldNode.to;
					const text = state.sliceDoc(from, to);
					// Identify if it's ** or __
					const marker = text.startsWith("**") ? "**" : (text.startsWith("__") ? "__" : "");
					if (marker) {
						view.dispatch({
							changes: [
								{ from, to: from + marker.length, insert: "" },
								{ from: to - marker.length, to, insert: "" }
							],
							selection: { anchor: from, head: to - (marker.length * 2) },
						});
						return true;
					}
				}

				// 2. Otherwise: Toggle ON (Wrap selection or current word)
				if (main.empty) {
					const word = state.wordAt(main.head);
					if (word) main = word;
				}

				const from = main.from, to = main.to;
				const text = state.sliceDoc(from, to);
				const insert = `**${text}**`;
				
				view.dispatch({
					changes: { from, to, insert },
					selection: { anchor: from + 2, head: from + 2 + text.length },
				});
				return true;
			},
		},
		{
			key: "Mod-i",
			run: (view) => {
				const { state } = view;
				let main = state.selection.main;
				const tree = syntaxTree(state);

				// 1. Try to find an Emphasis node wrapping the selection
				let italicNode: any = null;
				let cur: any = tree.resolveInner(main.head, -1);
				while (cur && cur.name !== "Document") {
					if (cur.name === "Emphasis") {
						italicNode = cur;
						break;
					}
					cur = cur.parent;
				}

				if (italicNode) {
					// Toggle OFF
					const from = italicNode.from, to = italicNode.to;
					const text = state.sliceDoc(from, to);
					const marker = text.startsWith("*") ? "*" : (text.startsWith("_") ? "_" : "");
					if (marker) {
						view.dispatch({
							changes: [
								{ from, to: from + marker.length, insert: "" },
								{ from: to - marker.length, to, insert: "" }
							],
							selection: { anchor: from, head: to - (marker.length * 2) },
						});
						return true;
					}
				}

				// 2. Otherwise: Toggle ON
				if (main.empty) {
					const word = state.wordAt(main.head);
					if (word) main = word;
				}

				const from = main.from, to = main.to;
				const text = state.sliceDoc(from, to);
				const insert = `*${text}*`;
				
				view.dispatch({
					changes: { from, to, insert },
					selection: { anchor: from + 1, head: from + 1 + text.length },
				});
				return true;
			},
		},
		{
			key: "Mod-Shift-x",
			run: (view) => {
				const { state } = view;
				let main = state.selection.main;
				const tree = syntaxTree(state);

				// 1. Try to find a Strikethrough node wrapping the selection
				let strikeNode: any = null;
				let cur: any = tree.resolveInner(main.head, -1);
				while (cur && cur.name !== "Document") {
					if (cur.name === "Strikethrough") {
						strikeNode = cur;
						break;
					}
					cur = cur.parent;
				}

				if (strikeNode) {
					// Toggle OFF
					const from = strikeNode.from, to = strikeNode.to;
					view.dispatch({
						changes: [
							{ from, to: from + 2, insert: "" },
							{ from: to - 2, to, insert: "" }
						],
						selection: { anchor: from, head: to - 4 },
					});
					return true;
				}

				// 2. Otherwise: Toggle ON
				if (main.empty) {
					const word = state.wordAt(main.head);
					if (word) main = word;
				}

				const from = main.from, to = main.to;
				const text = state.sliceDoc(from, to);
				const insert = `~~${text}~~`;
				
				view.dispatch({
					changes: { from, to, insert },
					selection: { anchor: from + 2, head: from + 2 + text.length },
				});
				return true;
			},
		},
		{
			key: "Shift-Enter",
			run: (view) => {
				const { state } = view;
				const main = state.selection.main;
				if (!main.empty) return false;

				const line = state.doc.lineAt(main.head);
				const text = line.text;

				// Match markers at the START of the physical line
				const match = /^(\s*)(?:(?:\*|-|\+|\d+\.|#+)\s+)/.exec(text);
				let indent = "";

				if (match) {
					// Rule: If we are on a marker line, Shift-Enter indents to the text start
					indent = " ".repeat(match[0].length);
				} else {
					// Rule: If we are already on an indented line (no marker), just preserve indentation
					const wsMatch = /^(\s*)/.exec(text);
					indent = wsMatch ? wsMatch[0] : "";
				}

				view.dispatch({
					changes: { from: main.head, insert: "\n" + indent },
					selection: { anchor: main.head + 1 + indent.length },
					scrollIntoView: true,
				});
				return true;
			},
		},
		{
			key: "Enter",
			run: (view) => {
				const { state } = view;
				const head = state.selection.main.head;
				const line = state.doc.lineAt(head);
				const text = line.text;

				// 1. Match empty markers for outdenting (existing behavior)
				const emptyMarkerMatch = text.match(/^(\s*)(\*|-|\+|\d+\.)\s*$/);
				if (emptyMarkerMatch) {
					const indent = emptyMarkerMatch[1];
					if (indent.length >= 2) {
						const newIndent = indent.substring(2);
						const marker = emptyMarkerMatch[2];
						view.dispatch({
							changes: {
								from: line.from,
								to: line.to,
								insert: newIndent + marker + " ",
							},
							selection: {
								anchor: line.from + newIndent.length + marker.length + 1,
							},
						});
						return true;
					} else {
						view.dispatch({
							changes: { from: line.from, to: line.to, insert: "" },
							selection: { anchor: line.from },
						});
						return false;
					}
				}

				// 2. Auto-continue list behavior (Direct marker on current line)
				const continueMatch = text.match(/^(\s*)(\*|-|\+|\d+\.)\s+(.+)$/);
				if (continueMatch) {
					const indent = continueMatch[1];
					let marker = continueMatch[2];
					if (/^\d+\.$/.test(marker)) {
						marker = parseInt(marker) + 1 + ".";
					}
					const prefix = `\n${indent}${marker} `;
					view.dispatch({
						changes: { from: head, insert: prefix },
						selection: { anchor: head + prefix.length },
					});
					return true;
				}

				// 3. New behavior: Shift-Enter was used previously (current line is purely indented)
				// If the current line is indented but has NO marker, we look UP to find the parent marker
				const pureIndentMatch = /^(\s+)[^\s\*\-\+#\d]/.exec(text);
				if (pureIndentMatch) {
					const currentIndent = pureIndentMatch[1];
					// Search backwards for the line that started this list item
					for (let l = line.number - 1; l >= 1; l--) {
						const prevLine = state.doc.line(l);
						const prevText = prevLine.text;
						const markerMatch = /^(\s*)(\*|-|\+|\d+\.)\s+/.exec(prevText);

						if (markerMatch) {
							const markerIndent = markerMatch[1];
							let marker = markerMatch[2];

							// Only continue if the indentation level matches or is smaller
							// (indicating this was the parent list item)
							if (
								currentIndent.length >=
								markerIndent.length + marker.length + 1
							) {
								if (/^\d+\.$/.test(marker)) {
									marker = parseInt(marker) + 1 + ".";
								}
								const prefix = `\n${markerIndent}${marker} `;
								view.dispatch({
									changes: { from: head, insert: prefix },
									selection: { anchor: head + prefix.length },
								});
								return true;
							}
							break; // Found a marker but it doesn't match the hierarchy
						}
						// If we find a heading or empty line, stop searching
						if (/^#+/.test(prevText.trim()) || prevText.trim() === "") break;
					}
				}

				return false;
			},
		},
		{
			key: "Backspace",
			run: (view) => {
				const { state } = view;
				const head = state.selection.main.head;
				const line = state.doc.lineAt(head);

				// Only trigger if cursor is at the end of an empty-looking marker line
				if (head !== line.to) return false;

				const emptyMarkerMatch = line.text.match(/^(\s*)(\*|-|\+|\d+\.)\s$/);
				const spacesMatch = line.text.match(/^(\s+)$/);

				if (emptyMarkerMatch) {
					const indent = emptyMarkerMatch[1];
					const marker = emptyMarkerMatch[2];
					if (indent.length >= 2) {
						// Outdent
						const newIndent = indent.substring(2);
						view.dispatch({
							changes: {
								from: line.from,
								to: line.to,
								insert: newIndent + marker + " ",
							},
							selection: {
								anchor: line.from + newIndent.length + marker.length + 1,
							},
						});
						return true;
					} else {
						// Clear
						view.dispatch({
							changes: { from: line.from, to: line.to, insert: "" },
							selection: { anchor: line.from },
						});
						return true;
					}
				} else if (spacesMatch) {
					view.dispatch({
						changes: { from: line.from, to: line.to, insert: "" },
						selection: { anchor: line.from },
					});
					return true;
				}
				return false;
			},
		},
		{
			key: "Mod-f",
			run: (view) => {
				// Redirect to canvas search
				globalState.setState({ isCanvasSearchOpen: true });
				window.dispatchEvent(new CustomEvent("inklink-focus-canvas-search"));
				return true;
			},
		},
		{
			key: "Mod-Shift-f",
			run: (view) => {
				globalState.setState({
					isEditorSearchOpen: true,
					isEditorReplaceOpen: false,
				});
				window.dispatchEvent(new CustomEvent("inklink-focus-editor-search"));
				return true;
			},
		},
		{
			key: "Mod-Shift-h",
			run: (view) => {
				globalState.setState({
					isEditorSearchOpen: true,
					isEditorReplaceOpen: true,
				});
				window.dispatchEvent(new CustomEvent("inklink-focus-editor-search"));
				return true;
			},
		},
	]);

	const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
		useFileDrop(autoSave);

	return (
		<div
			id="markdown-editor-root"
			className={cn(
				"flex h-full flex-col border-r bg-background relative group",
				isDragging &&
					"ring-2 ring-primary/40 ring-inset bg-primary/5 transition-all duration-200",
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="flex h-10 items-center justify-between border-b px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 group/header">
				<span>Markdown Editor</span>
				<div className="flex items-center gap-2">
					{isDragging && (
						<span className="text-[10px] opacity-40 font-normal normal-case animate-pulse">
							Drop to open file
						</span>
					)}
					{onClose && (
						<Button 
							variant="ghost" 
							size="icon" 
							className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
							onClick={onClose}
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			<style jsx global>{`
				.sleek-scrollbar::-webkit-scrollbar {
					width: 12px !important;
					height: 12px !important;
				}
				.sleek-scrollbar::-webkit-scrollbar-track {
					background-color: transparent !important;
					cursor: default !important;
				}
				.sleek-scrollbar::-webkit-scrollbar-thumb {
					background-color: hsl(var(--muted-foreground) / 0.05) !important;
					border-radius: 10px !important;
					border: 4px solid transparent !important;
					background-clip: content-box !important;
					cursor: pointer !important;
				}
				/* When the mouse enters the editor area, make the scrollbar slightly thicker and more visible */
				#markdown-editor-root:hover .sleek-scrollbar::-webkit-scrollbar-thumb {
					background-color: hsl(var(--muted-foreground) / 0.25) !important;
					border-width: 2.5px !important;
				}
				/* When hovering directly on the thumb, make it even thicker and darker */
				.sleek-scrollbar::-webkit-scrollbar-thumb:hover {
					background-color: hsl(var(--muted-foreground) / 0.45) !important;
					border-width: 1.5px !important;
				}
				.sleek-scrollbar::-webkit-scrollbar-thumb:active {
					background-color: hsl(var(--muted-foreground) / 0.6) !important;
					border-width: 1px !important;
				}
			`}</style>

			{/* VS Code Style Search Panel */}
			<MarkdownSearchPanel view={editorView} />

			<div
				className="flex-1 overflow-y-auto min-h-0 sleek-scrollbar"
				onClick={handleContainerClick}
			>
				<CodeMirror
					ref={(ref) => {
						editorRef.current = ref;
						if (ref?.view && editorView !== ref.view) {
							setEditorView(ref.view);
						}
					}}
					value={value}
					height="100%"
					theme={isDark ? oneDark : "light"}
					extensions={[
						mdLang({ codeLanguages: languages }),
						EditorView.lineWrapping,
						inklinkTheme,
						!isDark ? syntaxHighlighting(lightColorfulHighlightStyle) : [],
						Prec.highest(customKeymap),
						keymap.of([indentWithTab]),
						search(),
						searchHighlightPlugin,
						revealHighlightPlugin,
						autocompletion({ override: [htmlTagCompletionSource] }),
						autocompleteTabKeymap,
						syncTagsPlugin,
						EditorView.updateListener.of((update) => {
							if (update.docChanged && update.transactions.some(tr => tr.isUserEvent("delete.backward"))) {
								const head = update.state.selection.main.head;
								const before = update.state.sliceDoc(Math.max(0, head - 2), head);
								if (before === "<" || before.endsWith("<") || before === "</") {
									startCompletion(update.view);
								}
							}
						}),
					]}
					onChange={onChange}
					onUpdate={(update) => {
						// Update search stats whenever selection or document changes
						if (update.selectionSet || update.docChanged) {
							updateSearchStats(update.view);
						}

						// Link Popover Logic
						if (update.selectionSet || update.docChanged) {
							const head = update.state.selection.main.head;
							const link = getLinkAt(update.state, head);
							
							if (link && update.view.hasFocus) {
								const coords = update.view.coordsAtPos(head);
								if (coords) {
									setActiveLink({
										url: link.url,
										x: coords.left,
										y: coords.top
									});
								} else {
									setActiveLink(null);
								}
							} else if (activeLink) {
								setActiveLink(null);
							}
						}

						// Update global history status for toolbar parity
						if (update.docChanged) {
							const canUndo = undoDepth(update.state) > 0;
							const canRedo = redoDepth(update.state) > 0;
							const s = globalState.getState();
							if (canUndo !== s.editorCanUndo || canRedo !== s.editorCanRedo) {
								globalState.setState({
									editorCanUndo: canUndo,
									editorCanRedo: canRedo,
								});
							}
						}

						// Only trigger if selection (cursor) changed and it was an interaction
						if (
							update.selectionSet &&
							update.transactions.some(
								(tr) => tr.isUserEvent("select") || tr.isUserEvent("input"),
							)
						) {
							// Clear the yellow highlight if user moves cursor manually
							const isExternalReveal = update.transactions.some(tr => tr.isUserEvent("select.reveal"));
							if (!isExternalReveal && revealHighlight) {
								setRevealHighlight(null);
							}

							const head = update.state.selection.main.head;
							const line = update.state.doc.lineAt(head);
							const lineIndex = line.number - 1; // 0-based

							// Find the initiator line if the current line is a continuation line
							window.dispatchEvent(
								new CustomEvent("inklink-canvas-focus-node", {
									detail: { nodeId: `line_${lineIndex}` },
								}),
							);
						}
					}}
					placeholder="# Start typing your mind map here..."
					basicSetup={{
						lineNumbers: false,
						foldGutter: true,
						dropCursor: true,
						allowMultipleSelections: true,
						indentOnInput: true,
						syntaxHighlighting: true,
						bracketMatching: true,
						closeBrackets: true,
						autocompletion: true,
						rectangularSelection: true,
						crosshairCursor: true,
						highlightActiveLine: true,
						highlightSelectionMatches: false,
						tabSize: 2,
					}}
				/>
			</div>

			{/* Mobile Quick-action markdown bar above the keyboard */}
			<div className="md:hidden shrink-0 border-t bg-muted/40 px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
				{/* Indent Actions */}
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						if (editorView) indentLess(editorView);
					}}
					className="shrink-0 rounded-md border border-border/60 bg-background p-1.5 text-foreground hover:bg-muted active:scale-95 transition-all outline-none"
					aria-label="Outdent"
				>
					<ChevronLeft className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						if (editorView) indentMore(editorView);
					}}
					className="shrink-0 rounded-md border border-border/60 bg-background p-1.5 text-foreground hover:bg-muted active:scale-95 transition-all outline-none"
					aria-label="Indent"
				>
					<ChevronRight className="h-3.5 w-3.5" />
				</button>

				<div className="w-[1px] h-4 bg-border/60 mx-1" />

				{[
					{ label: "H1", insert: "# " },
					{ label: "H2", insert: "## " },
					{ label: "H3", insert: "### " },
					{ label: "-", insert: "- " },
					{ label: "[ ]", insert: "- [ ] " },
					{ label: "**B**", insert: "****", cursorOffset: 2 },
					{ label: "_I_", insert: "__", cursorOffset: 1 },
					{ label: "`C`", insert: "``", cursorOffset: 1 },
				].map((action) => (
					<button
						type="button"
						key={action.label}
						onMouseDown={(e) => {
							// Prevent blur on editor before inserting
							e.preventDefault();
							window.dispatchEvent(
								new CustomEvent("inklink-editor-insert", {
									detail: { insert: action.insert, cursorOffset: action.cursorOffset },
								})
							);
						}}
						className={cn(
							"shrink-0 rounded-md border border-border/60 bg-background px-2.5 py-1",
							"text-xs font-mono font-medium text-foreground",
							"hover:bg-muted active:scale-95 transition-all duration-100",
							"min-w-[36px] text-center"
						)}
					>
						{action.label}
					</button>
				))}
			</div>

			{/* Link Popover Overlay */}
			{activeLink && (
				<div 
					className="fixed z-40 pointer-events-none" 
					style={{ 
						left: activeLink.x, 
						top: activeLink.y + 24 // Offset below cursor
					}}
				>
					<LinkPopover 
						url={activeLink.url} 
						onClose={() => setActiveLink(null)} 
					/>
				</div>
			)}
		</div>
	);
}
