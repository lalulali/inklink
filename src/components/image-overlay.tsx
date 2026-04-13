"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, Maximize2, Download } from "lucide-react";
import { cn, normalizeUrl } from "@/lib/utils";

/**
 * Feature: Image Overlay (Lightbox)
 * Purpose: Provides a full-screen high-resolution preview of images from mind map nodes
 */
export function ImageOverlay() {
	const [activeImage, setActiveImage] = useState<string | null>(null);
	const [activeLink, setActiveLink] = useState<string | null>(null);
	const [altText, setAltText] = useState<string>("");
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		// Listen for image preview requests
		const handleShowPreview = (e: any) => {
			const { url, alt, link } = e.detail;
			setActiveImage(url);
			setActiveLink(link || null);
			setAltText(alt || "Image preview");
			setIsVisible(true);
		};

		window.addEventListener("inklink-image-preview", handleShowPreview);
		return () =>
			window.removeEventListener("inklink-image-preview", handleShowPreview);
	}, []);

	const close = () => {
		setIsVisible(false);
		// Delay clearing URL to allow exit animation to complete
		setTimeout(() => {
			setActiveImage(null);
			setActiveLink(null);
		}, 300);
	};

	const handleDownload = async () => {
		if (!activeImage) return;
		try {
			const response = await fetch(activeImage);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = activeImage.split("/").pop() || "image";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to download image:", err);
			// Fallback: just open in new tab
			window.open(activeImage, "_blank");
		}
	};

	if (!activeImage && !isVisible) return null;

	return (
		<Dialog open={isVisible} onOpenChange={(open) => !open && close()}>
			<DialogPortal>
				<DialogOverlay className="top-14" />
				<DialogPrimitive.Content
					className={cn(
						"fixed top-14 left-0 right-0 bottom-0 z-[101] w-screen h-[calc(100vh-3.5rem)]",
						"bg-black/95 outline-none overflow-hidden",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
						"data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
						"duration-300 ease-out origin-center",
					)}
				>
					<DialogPrimitive.Title className="sr-only">
						Image Preview: {altText}
					</DialogPrimitive.Title>

					<div className="relative w-full h-full flex flex-col">
						{/* Header Actions */}
						<div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
							<div className="flex flex-col gap-1 pointer-events-auto">
								<h3 className="text-white font-medium text-sm drop-shadow-md truncate max-w-[300px]">
									{altText}
								</h3>
								<p className="text-white/40 text-[10px] font-mono truncate max-w-[200px]">
									{activeImage}
								</p>
							</div>

							<div className="flex gap-2 pointer-events-auto">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleDownload}
									className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 transition-all"
									title="Download high-res image"
								>
									<Download className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									asChild
									className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 transition-all"
									title="Open in new tab"
								>
									<a
										href={activeImage!}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLink className="h-4 w-4" />
									</a>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={close}
									className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 transition-all"
								>
									<X className="h-5 w-5" />
								</Button>
							</div>
						</div>

						{/* Main Image View */}
						<div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]">
							<div className="relative group">
								<img
									src={activeImage!}
									alt={altText}
									className="max-w-full max-h-[80vh] object-contain rounded-sm shadow-2xl animate-in fade-in-0 duration-300"
								/>
								<div className="absolute inset-0 ring-1 ring-white/10 rounded-sm pointer-events-none" />
							</div>
						</div>

						{/* Footer Info */}
						<div className="p-8 bg-gradient-to-t from-black/20 to-transparent flex justify-center mt-auto">
							{activeLink ? (
								<Button
									variant="ghost"
									asChild
									className="group hover:bg-white/10 text-white/70
									px-4 py-2 bg-white/5 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-sm
									transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
								>
									<a
										href={normalizeUrl(activeLink)}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLink className="h-3 w-3 text-white/40" />
										<span className="text-[10px] text-white/60 font-medium tracking-widest uppercase">
											Open Link
										</span>
									</a>
								</Button>
							) : (
								<div className="px-4 py-2 bg-white/5 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-sm">
									<Maximize2 className="h-3 w-3 text-white/40" />
									<span className="text-[10px] text-white/60 font-medium tracking-wider uppercase">
										High-Res Preview
									</span>
								</div>
							)}
						</div>
					</div>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	);
}
