"use client";

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptTemplate } from './receipt-template';
import { Printer, Download, Loader2, Share2 } from 'lucide-react';
import type { BusinessProfile } from '@/lib/types';

interface ReceiptDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    data: any; // ReceiptData in template
    businessProfile: BusinessProfile;
    currencySymbol: string;
    type?: 'prestation' | 'client' | 'expense' | 'income' | 'other';
    title?: string;
}

export function ReceiptDialog({
    isOpen,
    onOpenChange,
    data,
    businessProfile,
    currencySymbol,
    type = 'other',
    title = "Aperçu du Reçu"
}: ReceiptDialogProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const generatePDF = async () => {
        // Dynamic imports for offline capability
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const receiptElement = document.getElementById('receipt-print-area');
        if (!receiptElement) {
            throw new Error('Receipt element not found');
        }

        // Capture the receipt as canvas
        const canvas = await html2canvas(receiptElement, {
            scale: 2, // Higher quality
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
        });

        // Convert to PDF (80mm width)
        const imgWidth = 80; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [imgWidth, imgHeight]
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        return pdf;
    };

    const getFilename = () => {
        const customerName = data.customerName || 'Client';
        const sanitizedName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        return `${sanitizedName}_${dateStr}.pdf`;
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const pdf = await generatePDF();
            const filename = getFilename();
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const pdf = await generatePDF();
            const filename = getFilename();
            const pdfBlob = pdf.output('blob');

            // Check if Web Share API is supported
            if (navigator.share && navigator.canShare) {
                const file = new File([pdfBlob], filename, { type: 'application/pdf' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Reçu - ${data.customerName || 'Client'}`,
                        text: `Reçu de paiement du ${new Date().toLocaleDateString('fr-FR')}`
                    });
                } else {
                    // Fallback: download if sharing files is not supported
                    pdf.save(filename);
                    alert('Le partage n\'est pas supporté sur cet appareil. Le fichier a été téléchargé.');
                }
            } else {
                // Fallback: download if Web Share API is not supported
                pdf.save(filename);
                alert('Le partage n\'est pas supporté sur cet appareil. Le fichier a été téléchargé.');
            }
        } catch (error) {
            console.error('Error sharing PDF:', error);
            // Don't show error if user cancelled the share
            if (error instanceof Error && error.name !== 'AbortError') {
                alert('Erreur lors du partage. Veuillez réessayer.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    if (!data || !businessProfile) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-2xl bg-gray-50 dark:bg-gray-900">
                <DialogHeader className="no-print">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Prévisualisez le reçu avant de l'imprimer, le télécharger ou le partager.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center p-4" id="receipt-print-area">
                    <ReceiptTemplate
                        data={data}
                        businessProfile={businessProfile}
                        currencySymbol={currencySymbol}
                        type={type}
                    />
                </div>

                <DialogFooter className="no-print gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fermer
                    </Button>
                    <Button variant="secondary" onClick={handleShare} disabled={isSharing}>
                        {isSharing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Partage...
                            </>
                        ) : (
                            <>
                                <Share2 className="mr-2 h-4 w-4" />
                                Partager
                            </>
                        )}
                    </Button>
                    <Button variant="secondary" onClick={handleDownload} disabled={isDownloading}>
                        {isDownloading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Téléchargement...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                            </>
                        )}
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
