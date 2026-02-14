"use client";

import React from 'react';
import { AppLogo } from '@/components/layout/app-logo';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { cn } from '@/lib/utils';
import type { BusinessProfile } from '@/lib/types';
import { Globe, Phone, Mail, Building } from 'lucide-react';

interface ReceiptItem {
    description: string;
    quantity: number;
    price: number;
    name: string;
}

interface ReceiptData {
    id: string;
    date: Date;
    customerName?: string;
    items: ReceiptItem[];
    totalAmount: number;
    amountPaid: number;
    notes?: string;
}

interface ReceiptTemplateProps {
    data: ReceiptData;
    businessProfile: BusinessProfile;
    currencySymbol: string;
    type?: 'prestation' | 'client' | 'expense' | 'income' | 'other';
}

export const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({ data, businessProfile, currencySymbol, type = 'other' }) => {

    const remainingBalance = data.totalAmount - data.amountPaid;

    const receiptTypeLabels = {
        prestation: "REÇU DE PRESTATION",
        client: "RELEVÉ DE COMPTE CLIENT",
        expense: "JUSTIFICATIF DE DÉPENSE",
        income: "REÇU DE REVENU",
        other: "REÇU DE PAIEMENT"
    };

    const isFreePlan = businessProfile.subscriptionType === 'gratuit';
    const terms = isFreePlan
        ? "Ce reçu est généré par TTR gestion"
        : businessProfile.termsAndConditions;


    return (
        <div className={cn(
            "p-4 md:p-8 bg-white text-gray-800 mx-auto max-w-2xl font-sans relative overflow-hidden",
            "shadow-lg rounded-lg",
            "print:shadow-none print:p-2 print:rounded-none print:max-w-full"
        )}>
            {businessProfile.receiptWatermarkEnabled !== false && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none print:hidden"
                    aria-hidden="true"
                >
                    <p className="text-[12vw] font-black text-gray-200/50 -rotate-[30deg] opacity-50 select-none">
                        {businessProfile.name}
                    </p>
                </div>
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8 border-b pb-4">
                    <div>
                        {businessProfile.logoUrl ? (
                            <div className="mb-2">
                                <img
                                    src={businessProfile.logoUrl}
                                    alt={`${businessProfile.name} Logo`}
                                    className="object-contain"
                                    style={{ maxWidth: '80px', maxHeight: '80px' }}
                                />
                            </div>
                        ) : (
                            <AppLogo className="h-16 w-16 mb-2" />
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold">{businessProfile.name}</h1>
                        <p className="text-gray-500 text-sm">{businessProfile.type}</p>
                    </div>
                    <div className="text-right text-xs text-gray-600 space-y-1">
                        {businessProfile.businessAddress && <div className="flex justify-end items-center gap-2"><p>{businessProfile.businessAddress}</p><Building className="h-3 w-3" /></div>}
                        {businessProfile.businessPhoneNumber && <div className="flex justify-end items-center gap-2"><p>{businessProfile.businessPhoneNumber}</p><Phone className="h-3 w-3" /></div>}
                        {businessProfile.professionalEmail && <div className="flex justify-end items-center gap-2"><p>{businessProfile.professionalEmail}</p><Mail className="h-3 w-3" /></div>}
                        {businessProfile.website && <div className="flex justify-end items-center gap-2"><p>{businessProfile.website}</p><Globe className="h-3 w-3" /></div>}
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-xl md:text-2xl font-semibold uppercase tracking-wider">{receiptTypeLabels[type]}</h2>
                    <p className="text-xs text-gray-500 mt-1">ID Transaction: {data.id.slice(0, 8).toUpperCase()}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 uppercase">
                            {data.customerName ? "Facturé à" : "Bénéficiaire"}
                        </h3>
                        <p className="font-bold">{data.customerName || businessProfile.name}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase">Date du reçu</h3>
                        <p className="font-bold">{format(data.date, 'dd MMMM yyyy, HH:mm', { locale: fr })}</p>
                    </div>
                </div>

                <table className="w-full text-sm border-collapse mb-8">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border-b p-2 text-left font-semibold">Description</th>
                            <th className="border-b p-2 text-center font-semibold">Qté</th>
                            <th className="border-b p-2 text-right font-semibold">Prix Unitaire</th>
                            <th className="border-b p-2 text-right font-semibold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, index) => (
                            <tr key={index}>
                                <td className="p-2 border-b">{item.name || item.description}</td>
                                <td className="p-2 border-b text-center">{item.quantity}</td>
                                <td className="p-2 border-b text-right">{item.price.toLocaleString('fr-FR')} {currencySymbol}</td>
                                <td className="p-2 border-b text-right font-medium">{(item.quantity * item.price).toLocaleString('fr-FR')} {currencySymbol}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="w-full md:w-1/2">
                        {data.notes && (
                            <>
                                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Notes</h3>
                                <p className="text-xs text-gray-600 italic">{data.notes}</p>
                            </>
                        )}
                    </div>

                    <div className="w-full md:w-1/2 flex justify-end">
                        <div className="w-full max-w-xs">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Sous-total:</span>
                                <span>{data.totalAmount.toLocaleString('fr-FR')} {currencySymbol}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Taxes (0%):</span>
                                <span>0 {currencySymbol}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="flex justify-between font-bold text-lg mb-2">
                                <span>Total:</span>
                                <span>{data.totalAmount.toLocaleString('fr-FR')} {currencySymbol}</span>
                            </div>
                            {(type === 'prestation' || type === 'client') && (
                                <>
                                    <div className="flex justify-between text-sm text-green-600 mb-2">
                                        <span>Montant Payé:</span>
                                        <span className="font-bold">{data.amountPaid.toLocaleString('fr-FR')} {currencySymbol}</span>
                                    </div>
                                    <div className={cn(
                                        "flex justify-between font-bold text-lg p-2 rounded-md",
                                        remainingBalance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    )}>
                                        <span>Solde restant:</span>
                                        <span>{remainingBalance.toLocaleString('fr-FR')} {currencySymbol}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-xs text-gray-500 border-t pt-4">
                    {terms && (
                        <div className="text-center mb-4 italic">
                            <p>{terms}</p>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <div>
                            <p>Merci pour votre confiance.</p>
                            <p>{businessProfile.name} - {new Date().getFullYear()}</p>
                            {businessProfile.website && (
                                <a href={businessProfile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {businessProfile.website}
                                </a>
                            )}
                        </div>
                        {businessProfile.website && (
                            <div className="text-center">
                                <QRCode value={businessProfile.website} size={64} level="M" includeMargin={false} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
