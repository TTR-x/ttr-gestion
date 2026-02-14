"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, Share2, ArrowLeft, Loader2 } from 'lucide-react';
import type { BusinessProfile } from '@/lib/types';

interface ReceiptActionsProps {
    receiptData: any;
    businessProfile: BusinessProfile;
    elementId?: string;
}

export function ReceiptActions({ receiptData, businessProfile, elementId = 'receipt-print-area' }: ReceiptActionsProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect if running on mobile/Android
        const checkMobile = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            setIsMobile(isMobileDevice);
        };

        checkMobile();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const generatePDF = async () => {
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');

        const receiptElement = document.getElementById(elementId);
        if (!receiptElement) {
            throw new Error('Receipt element not found');
        }

        const canvas = await html2canvas(receiptElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        return pdf;
    };

    const getFilename = () => {
        const customerName = receiptData.customerName || 'Client';
        const sanitizedName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        return `recu_${sanitizedName}_${dateStr}.pdf`;
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

            if (navigator.share && navigator.canShare) {
                const file = new File([pdfBlob], filename, { type: 'application/pdf' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Reçu - ${receiptData.customerName || 'Client'}`,
                        text: `Reçu de paiement du ${new Date().toLocaleDateString('fr-FR')}`
                    });
                } else {
                    pdf.save(filename);
                    alert('Le partage n\'est pas supporté sur cet appareil. Le fichier a été téléchargé.');
                }
            } else {
                pdf.save(filename);
                alert('Le partage n\'est pas supporté sur cet appareil. Le fichier a été téléchargé.');
            }
        } catch (error) {
            console.error('Error sharing PDF:', error);
            if (error instanceof Error && error.name !== 'AbortError') {
                alert('Erreur lors du partage. Veuillez réessayer.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleBack = () => {
        window.history.back();
    };

    return (
        <div className="no-print sticky top-0 z-50 bg-white dark:bg-gray-900 border-b shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-xl md:text-2xl font-bold">Aperçu avant impression</h1>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour
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
                                    Télécharger PDF
                                </>
                            )}
                        </Button>
                        {/* Hide print button on mobile/Android */}
                        {!isMobile && (
                            <Button onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimer
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
