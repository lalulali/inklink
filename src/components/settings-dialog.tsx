/**
 * Feature: Settings Dialog
 * Purpose: Allows users to configure auto-save behavior and cleanup policies
 * Dependencies: shadcn/ui components, lucide-react icons
 */

"use client";

import React from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
	Settings as SettingsIcon,
	Shield as ShieldIcon,
	Clock as ClockIcon,
	Trash2 as Trash2Icon,
	Github as GithubIcon,
	Monitor as MonitorIcon,
	X as XIcon,
} from "lucide-react";
import { globalState } from "@/core/state/state-manager";
import { useWebPlatform } from "@/platform/web/web-platform-context";
import { useNotification } from "@/platform/web/web-notification-manager";

export function SettingsDialog() {
	const { factory } = useWebPlatform();
	const { showSuccess, showError, showInfo } = useNotification();
	const [isOpen, setIsOpen] = React.useState(false);
	const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
	const [preferences, setPreferences] = React.useState(
		globalState.getState().preferences,
	);
	const pendingPrefsRef = React.useRef<typeof preferences>(
		globalState.getState().preferences,
	);
	const [isConfirmingClear, setIsConfirmingClear] = React.useState(false);
	const [isClearing, setIsClearing] = React.useState(false);
	const [extensionVersion, setExtensionVersion] = React.useState<string | null>(
		null,
	);

	React.useEffect(() => {
		const fetchVersion = async () => {
			try {
				const response = await fetch(
					"https://open-vsx.org/api/ChrisHadi/inklink",
				);
				if (response.ok) {
					const data = await response.json();
					if (data.version) {
						setExtensionVersion(`v${data.version}`);
					}
				}
			} catch (error) {
				console.error("Failed to fetch extension version:", error);
			}
		};

		fetchVersion();

		return globalState.subscribe((s) => {
			setIsOpen(s.isSettingsDialogOpen);
			// Only sync from global if we aren't currently "pending" a save to avoid jitter
			if (!saveTimeoutRef.current) {
				setPreferences(s.preferences);
				pendingPrefsRef.current = s.preferences;
			}
		});
	}, []);

	const handleClose = () => {
		// Force immediate save if pending
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
			const storage = factory.createStorageAdapter();
			storage.savePreferences(pendingPrefsRef.current);
			globalState.setState({ preferences: pendingPrefsRef.current });
		}
		globalState.setState({ isSettingsDialogOpen: false });
	};

	const updatePreference = async <K extends keyof typeof preferences>(
		key: K,
		value: (typeof preferences)[K],
	) => {
		// 1. Calculate latest state immediately
		const nextPrefs = { ...pendingPrefsRef.current, [key]: value };
		pendingPrefsRef.current = nextPrefs;
		setPreferences(nextPrefs);

		// 2. Debounce the persistence and notification
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

		saveTimeoutRef.current = setTimeout(async () => {
			saveTimeoutRef.current = null; // Mark as done
			try {
				const storage = factory.createStorageAdapter();
				await storage.savePreferences(nextPrefs);
				globalState.setState({ preferences: nextPrefs });
				showSuccess("Settings updated");
			} catch {
				showError("Failed to save settings");
			}
		}, 800);
	};

	const handleClearAll = async () => {
		try {
			setIsClearing(true);
			showInfo("Clearing snapshot storage...");
			const storage = factory.createStorageAdapter();
			await storage.clearAllAutoSaves();

			// Clear current recovery state to reflect changes immediately
			globalState.setState({
				recoveryRecord: null,
				isRecoveryDialogOpen: false,
			});

			showSuccess("All local auto-save records cleared");
			setIsConfirmingClear(false);
		} catch {
			showError("Failed to clear records");
		} finally {
			setIsClearing(false);
		}
	};

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<SheetContent
				side="right"
				id="settings-dialog-root"
				className="w-[400px] sm:w-[540px] sm:max-w-md p-0 bg-background flex flex-col border-l border-border"
			>
				<style jsx global>{`
					#settings-dialog-root .sleek-scrollbar::-webkit-scrollbar {
						width: 12px !important;
						height: 12px !important;
					}
					#settings-dialog-root .sleek-scrollbar::-webkit-scrollbar-track {
						background-color: transparent !important;
					}
					#settings-dialog-root .sleek-scrollbar::-webkit-scrollbar-thumb {
						background-color: hsl(var(--muted-foreground) / 0.05) !important;
						border-radius: 10px !important;
						border: 4px solid transparent !important;
						background-clip: content-box !important;
						cursor: pointer !important;
					}
					#settings-dialog-root:hover .sleek-scrollbar::-webkit-scrollbar-thumb {
						background-color: hsl(var(--muted-foreground) / 0.25) !important;
						border-width: 2.5px !important;
					}
					#settings-dialog-root .sleek-scrollbar::-webkit-scrollbar-thumb:hover {
						background-color: hsl(var(--muted-foreground) / 0.45) !important;
						border-width: 1.5px !important;
					}
				`}</style>
				<SheetHeader className="p-6 border-b border-border/50 bg-background sticky top-0 z-10 flex flex-row items-start justify-between space-y-0">
					<div className="flex flex-col gap-1.5 flex-1">
						<SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
							<SettingsIcon className="w-5 h-5 text-primary" />
							Application Settings
						</SheetTitle>
						<SheetDescription className="text-muted-foreground text-left">
							Configure your local-first experience and data recovery preferences.
						</SheetDescription>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9 rounded-full hover:bg-muted transition-colors -mt-1 -mr-2"
						onClick={handleClose}
					>
						<XIcon className="h-5 w-5 text-muted-foreground" />
						<span className="sr-only">Close</span>
					</Button>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto pb-6 pr-6 pl-6 sleek-scrollbar">
					<div className="grid gap-6 ">
						{/* Maintenance Section */}
						<div className="mt-2 pt-2">
							<div className="flex items-center gap-2 mb-4">
								<ClockIcon className="w-4 h-4 text-amber-500" />
								<h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em]">
									Maintenance
								</h3>
							</div>
							<div className="flex flex-col gap-4">
								{/* Continuous File Sync */}
								<div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted border border-border/50 transition-colors hover:border-primary/20 group">
									<div className="flex flex-col gap-1">
										<Label
											htmlFor="auto-save-file"
											className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors"
										>
											Continuous File Sync
										</Label>
										<span className="text-xs text-muted-foreground leading-relaxed">
											Automatically write changes back to the opened file every
											30s.
										</span>
									</div>
									<Switch
										id="auto-save-file"
										checked={preferences.autoSaveToFileEnabled}
										onCheckedChange={(val: boolean) =>
											updatePreference("autoSaveToFileEnabled", val)
										}
									/>
								</div>

								{/* Automatic Cleanup */}
								<div className="flex flex-col gap-3 p-5 rounded-2xl bg-muted border border-border/50 transition-colors hover:border-amber-500/20 group">
									<div className="flex items-center gap-2">
										<Label
											htmlFor="cleanup-days"
											className="text-sm font-bold tracking-tight"
										>
											Automatic Cleanup
										</Label>
									</div>
									<div className="flex items-center gap-4">
										<Input
											id="cleanup-days"
											type="number"
											min="1"
											max="90"
											value={preferences.autoCleanupDays}
											onChange={(e) =>
												updatePreference(
													"autoCleanupDays",
													parseInt(e.target.value) || 30,
												)
											}
											className="w-20 bg-background border-border/60 focus:ring-2 focus:ring-primary/20 h-9 font-medium"
										/>
										<span className="text-xs text-muted-foreground leading-relaxed">
											Days to keep local recovery record before automatic
											deletion.
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* VS Code Extension Section */}
						<div className="mt-4 pt-6 border-t border-border">
							<div className="flex items-center gap-2 mb-4">
								<MonitorIcon className="w-4 h-4 text-primary" />
								<h3 className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
									IDE Extensions
								</h3>
							</div>
							<div className="flex flex-col gap-4 p-5 rounded-2xl bg-muted border border-border/50 transition-all hover:bg-muted/80 group/ext shadow-sm hover:shadow-md">
								<div className="flex items-center gap-3">
									<div className="bg-primary/10 p-2.5 rounded-xl group-hover/ext:bg-primary/15 transition-all group-hover/ext:scale-110">
										<MonitorIcon className="w-5 h-5 text-primary" />
									</div>
									<div className="flex flex-col">
										<h3 className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
											Inklink for VS Code
										</h3>
										<div className="flex items-center gap-1.5 mt-0.5">
											<span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
											<span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
												{extensionVersion
													? `${extensionVersion} is Live`
													: "Checking updates..."}
											</span>
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed pr-2">
									Think faster, navigate deeper. Bring{" "}
									<b>Inklink visualization</b> directly into your favorite IDE
									(VS Code, Cursor, Windsurf, etc.).
								</p>
								<div className="grid grid-cols-2 gap-3 mt-1">
									<Button
										variant="default"
										size="sm"
										className="h-10 gap-2 text-[9px] font-black uppercase tracking-[0.15em] hover:opacity-90 transition-all shadow-sm active:scale-95 bg-[#007ACC] hover:bg-[#007ACC]/90 border-none"
										asChild
									>
										<a
											href="https://marketplace.visualstudio.com/items?itemName=ChrisHadi.inklink"
											target="_blank"
											rel="noopener noreferrer"
										>
											Marketplace
										</a>
									</Button>
									<Button
										variant="default"
										size="sm"
										className="h-10 gap-2 text-[9px] font-black uppercase tracking-[0.15em] hover:opacity-90 transition-all shadow-sm active:scale-95 bg-[#5D2F92] hover:bg-[#5D2F92]/90 border-none"
										asChild
									>
										<a
											href="https://open-vsx.org/extension/ChrisHadi/inklink"
											target="_blank"
											rel="noopener noreferrer"
										>
											Open VSX
										</a>
									</Button>
								</div>
							</div>
						</div>

						{/* Project Link */}
						<div className="flex justify-center items-center mt-4">
							<a
								href="https://github.com/lalulali/inklink"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground/60 hover:text-primary transition-all font-bold text-[9px] uppercase tracking-[0.2em]"
							>
								<GithubIcon className="h-3 w-3" />
								View Project on GitHub
							</a>
						</div>

						{/* Danger Zone */}
						<div className="mt-4 pt-6 border-t border-border">
							<div className="flex items-center gap-2 mb-4">
								<ShieldIcon className="w-4 h-4 text-destructive" />
								<h3 className="text-[10px] font-extrabold text-destructive uppercase tracking-[0.2em]">
									Danger Zone
								</h3>
							</div>
							{!isConfirmingClear ? (
								<Button
									variant="destructive"
									className="w-full gap-2 h-11 font-bold text-[10px] uppercase tracking-wider bg-destructive text-white shadow-lg shadow-destructive/20 transition-all group"
									onClick={() => setIsConfirmingClear(true)}
								>
									<Trash2Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
									Clear All Local Snapshots
								</Button>
							) : (
								<div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 animate-in fade-in slide-in-from-top-2">
									<p className="text-xs font-bold text-destructive mb-3 text-center">
										Are you absolutely sure?
									</p>
									<div className="grid grid-cols-2 gap-2">
										<Button
											variant="destructive"
											className="h-9 text-[10px] font-black uppercase tracking-widest"
											onClick={handleClearAll}
											disabled={isClearing}
										>
											{isClearing ? "Clearing..." : "Yes, Purge All"}
										</Button>
										<Button
											variant="outline"
											className="h-9 text-[10px] font-black uppercase tracking-widest border-border/40"
											onClick={() => setIsConfirmingClear(false)}
										>
											Cancel
										</Button>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
