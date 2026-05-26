// =========================================================================
// PDF MANAGER FINAL - VERSIÓ PRODUCCIÓ v8.12 (GRÀFIC AJUSTAT & TEXT FIX)
// =========================================================================

async function exportPDF() {
    if (!state.stirrupResults) { 
        showToast('Calcula primer l\'estrep', 'error'); 
        return; 
    }

    try {
        showToast('Generant report professional...', 'success');

         if (typeof PDF_TEMPLATES === 'undefined') {
            throw new Error("PDF_TEMPLATES no trobat. Revisa language_pdf.js");
        }
        
        const selectedTemplate = PDF_TEMPLATES[state.lang] || PDF_TEMPLATES['ca'];
        
        if (!selectedTemplate) {
            throw new Error(`No s'ha trobat la plantilla per a l'idioma: ${state.lang}`);
        }

        const base64Data = selectedTemplate.replace(/^data:application\/pdf;base64,/, "");
        const pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        
        const fontSize = 20; 
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const res = state.stirrupResults;

        const fmt = (val) => {
            const num = parseFloat(val);
            if (isNaN(num)) return "---";
            return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
        };

        const drawValue = (text, x, y, rotate = 0) => {
            firstPage.drawText(text.toString(), {
                x: x, y: y, size: fontSize, color: PDFLib.rgb(0, 0, 0), rotate: PDFLib.degrees(rotate),
            });
        };

        // PÀGINA 1: Mapeig de coordinates
        drawValue(fmt(res.taglioA), 680, 800, -90);
        drawValue(fmt(res.linearDev), 680, 720, -90);
        drawValue(fmt(res.guidaFilo), 468, 790, -90);
        drawValue(fmt(res.transfer), 322, 770, -90);
        drawValue(fmt(res.gruppoC), 128, 785, -90);
        drawValue(fmt(res.gruppoD), 128, 715, -90);
        drawValue(fmt(res.centradorL), 723, 228, -90);
        drawValue(fmt(res.pinces), 375, 222, -90);
        drawValue(fmt(res.w), 291, 222, -90);
        drawValue(fmt(res.h), 215, 130, -90);
        drawValue(fmt(res.w), 55, 450, -90);
        drawValue(fmt(res.h), 55, 328, -90);
               // 1. Llegim la velocitat
        const speedVal = document.getElementById('input-speed')?.value || "---";
        drawValue(speedVal, 190, 370, -90); 

        // 2. Diàmetres (Estrep i Longitudinal)
        drawValue(`Ø${state.diameter}`, 240, 360, -90);                  
        drawValue(`Ø${state.longDiameter}`, 290, 360, -90);             

        // 3. Pisor (Afegint el " mm" automàticament per a professionalitat)
        const pisorRaw = document.getElementById('input-pisor')?.value || "---";
        const pisorText = pisorRaw !== "---" ? `${pisorRaw} mm` : "---";
        drawValue(pisorText, 540, 248, -90); 

        // -------------------------------------------------------------------
        // PÀGINA 2: REPORT DE ZUNXO (SÚPER AJUSTAT)
        // -------------------------------------------------------------------
        const secondPage = pdfDoc.addPage([595, 842]); 
        const height2 = secondPage.getHeight();
        const t = translations[state.lang] || translations['ca'];

        secondPage.drawText(t.zunxoReport || "REPORT ZUNXO", {
            x: 50, y: height2 - 50, size: 20, color: PDFLib.rgb(0, 0, 0)
        });
        secondPage.drawText(`${t.pdfDate || 'Data'}: ${new Date().toLocaleDateString()}`, {
            x: 50, y: height2 - 70, size: 10
        });

        const zTotal = document.getElementById('zunxo-total')?.value || "0";
        const zTip1 = document.getElementById('zunxo-tip1')?.value || "0";
        const zTip2 = document.getElementById('zunxo-tip2')?.value || "0";

        secondPage.drawText(`${t.pdfTotal || 'Total'}: ${zTotal} mm`, { x: 50, y: height2 - 100, size: 12 });
        
        // FORÇEM el text correcte aquí per si la traducció falla
        const labelPuntes = t.pdfTips || "Punta Inicial / Final";
        secondPage.drawText(`${labelPuntes}: ${zTip1} / ${zTip2} mm`, { x: 50, y: height2 - 115, size: 12 });

        secondPage.drawText(t.pdfSteps || "DETALL PASSOS", { x: 50, y: height2 - 160, size: 14 });
        
        const startX = 50;
        const startY = height2 - 180;
        secondPage.drawText("Pass", { x: startX, y: startY, size: 10 });
        secondPage.drawText("Dist. (mm)", { x: startX + 60, y: startY, size: 10 });
        secondPage.drawText(t.pdfStepsCount || "Cant. passos", { x: startX + 140, y: startY, size: 10 });
        secondPage.drawText("Subtotal", { x: startX + 230, y: startY, size: 10 });
        secondPage.drawLine({ start: { x: startX, y: startY - 5 }, end: { x: startX + 300, y: startY - 5 }, thickness: 1 });

        let currentRowY = startY - 20;
        let stepCount = 0;
        for (let i = 1; i <= 10; i++) {
            const d = document.getElementById(`zd-${i}`)?.value;
            const s = document.getElementById(`zs-${i}`)?.value;
            if (d && s) {
                stepCount++;
                secondPage.drawText(`${stepCount}`, { x: startX, y: currentRowY, size: 10 });
                secondPage.drawText(`${d}`, { x: startX + 60, y: currentRowY, size: 10 });
                secondPage.drawText(`${s}`, { x: startX + 140, y: currentRowY, size: 10 });
                secondPage.drawText(`${fmt(parseFloat(d) * parseFloat(s))}`, { x: startX + 230, y: currentRowY, size: 10 });
                currentRowY -= 15;
            }
        }

        // --- CORRECCIÓ GRÀFIC TALLAT ---
        const canvas = document.getElementById('zunxoCanvas');
        if (canvas) {
            try {
                const canvasImageBase64 = canvas.toDataURL('image/png');
                const canvasImage = await pdfDoc.embedPng(canvasImageBase64);
                
                // Calculled la proporció real de l'imatge
                const scaleFactor = 500 / canvasImage.width;
                const finalHeight = canvasImage.height * scaleFactor;
                
                secondPage.drawText("ESQUEMA VISUAL", { x: 50, y: currentRowY - 20, size: 14 });
                secondPage.drawImage(canvasImage, {
                    x: 50,
                    y: currentRowY - finalHeight - 10, // Ajustem la posició segons la l'alçada real
                    width: 500,
                    height: finalHeight,
                });
            } catch (e) { console.warn("No s'ha pogut afegir el gràfic"); }
        }

        const pdfBytesFinal = await pdfDoc.save();
        const blob = new Blob([pdfBytesFinal], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Report_Estrep_${res.w}x${res.h}.pdf`;
        link.click();

        showToast('Report professional generat!', 'success');

    } catch (error) {
        console.error("Error final PDF Manager:", error);
        showToast('Error: ' + error.message, 'error');
    }
}
