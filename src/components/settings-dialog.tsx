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
    Monitor as MonitorIcon
} from "lucide-react";
import { globalState } from "@/core/state/state-manager";
import { useWebPlatform } from "@/platform/web/web-platform-context";
import { useNotification } from "@/platform/web/web-notification-manager";

export function SettingsDialog() {
	const { factory } = useWebPlatform();
	const { showSuccess, showError, showInfo } = useNotification();
	const [isOpen, setIsOpen] = React.useState(false);
	const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
	const [preferences, setPreferences] = React.useState(globalState.getState().preferences);
    const pendingPrefsRef = React.useRef<typeof preferences>(globalState.getState().preferences);
	const [isConfirmingClear, setIsConfirmingClear] = React.useState(false);
	const [isClearing, setIsClearing] = React.useState(false);

	React.useEffect(() => {
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
		value: (typeof preferences)[K]
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
            globalState.setState({ recoveryRecord: null, isRecoveryDialogOpen: false });
            
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
			<SheetContent side="right" className="w-[400px] sm:w-[540px] sm:max-w-md overflow-y-auto bg-background flex flex-col p-6 border-l border-border">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
						<SettingsIcon className="w-5 h-5 text-primary" />
						Application Settings
					</SheetTitle>
					<SheetDescription className="text-muted-foreground text-left">
						Configure your local-first experience and data recovery preferences.
					</SheetDescription>
				</SheetHeader>

				<div className="grid gap-6 py-4">
					{/* Auto-Save to File */}
					<div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 transition-colors hover:border-primary/20 group">
						<div className="flex flex-col gap-1">
							<Label htmlFor="auto-save-file" className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">
								Continuous File Sync
							</Label>
							<span className="text-xs text-muted-foreground leading-relaxed">
								Automatically write changes back to the opened file every 30s.
							</span>
						</div>
						<Switch
							id="auto-save-file"
							checked={preferences.autoSaveToFileEnabled}
							onCheckedChange={(val: boolean) => updatePreference("autoSaveToFileEnabled", val)}
						/>
					</div>
					{/* Cleanup Policy */}
					<div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 transition-colors hover:border-amber-500/20 group">
						<div className="flex items-center gap-2">
							<ClockIcon className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
							<Label htmlFor="cleanup-days" className="text-sm font-bold tracking-tight">
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
								onChange={(e) => updatePreference("autoCleanupDays", parseInt(e.target.value) || 30)}
								className="w-20 bg-background border-border/60 focus:ring-2 focus:ring-primary/20 h-9 font-medium"
							/>
							<span className="text-xs text-muted-foreground leading-relaxed">
								Days to keep local recovery data before automatic deletion.
							</span>
						</div>
					</div>

					{/* VS Code Extension Section */}
					<div className="flex flex-col gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/[0.08] group/ext">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 p-2 rounded-lg group-hover/ext:bg-primary/20 transition-colors">
								<MonitorIcon className="w-4 h-4 text-primary" />
							</div>
							<div className="flex flex-col">
								<h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">VS Code Extension</h3>
								<span className="text-[9px] text-muted-foreground font-medium">Available now for v0.1.1</span>
							</div>
						</div>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Visualize your Markdown files directly inside your favorite editor with the **Inklink extension**.
						</p>
						<div className="grid grid-cols-2 gap-3 mt-1">
							<Button variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-black uppercase tracking-widest border-primary/20 bg-background/50 hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm" asChild>
								<a href="https://marketplace.visualstudio.com/items?itemName=ChrisHadi.inklink" target="_blank" rel="noopener noreferrer">
									Marketplace
								</a>
							</Button>
							<Button variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-black uppercase tracking-widest border-primary/20 bg-background/50 hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm" asChild>
								<a href="https://open-vsx.org/extension/ChrisHadi/inklink" target="_blank" rel="noopener noreferrer">
									Open VSX
								</a>
							</Button>
						</div>
					</div>

					{/* Danger Zone */}
					<div className="mt-2 pt-6 border-t border-border">
						<div className="flex items-center gap-2 mb-4">
							<ShieldIcon className="w-4 h-4 text-destructive" />
							<h3 className="text-[10px] font-extrabold text-destructive uppercase tracking-[0.2em]">Danger Zone</h3>
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
                                <p className="text-xs font-bold text-destructive mb-3 text-center">Are you absolutely sure?</p>
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

				<div className="flex justify-between items-center pt-6 mt-4 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-primary transition-colors font-bold text-[10px] uppercase tracking-widest" asChild>
                        <a href="https://github.com/lalulali/inklink" target="_blank" rel="noopener noreferrer">
                            <GithubIcon className="h-4 w-4" />
                            Source Code
                        </a>
                    </Button>
					<Button 
                        onClick={handleClose} 
                        variant="secondary" 
                        className="h-10 px-8 font-bold uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
						Done
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
