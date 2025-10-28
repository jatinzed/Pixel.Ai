import React, { useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons';

interface LiveViewProps {
  isOpen: boolean;
  onClose: () => void;
  audioLevel: number;
}

export const LiveView: React.FC<LiveViewProps> = ({ isOpen, onClose, audioLevel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();
    const smoothedAmplitude = useRef(5); // Start with base amplitude

    useEffect(() => {
        if (!isOpen || !canvasRef.current) {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;
        
        const resizeCanvas = () => {
            if(canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const draw = () => {
            time += 0.02;
            const { width, height } = canvas;
            ctx.clearRect(0, 0, width, height);

            // Calculate target amplitude based on audio level and a breathing base
            const baseAmplitude = 5 + Math.sin(time) * 1.5;
            const dynamicAmplitude = audioLevel * 700;
            const targetAmplitude = Math.min(baseAmplitude + dynamicAmplitude, height / 3);

            // Apply easing to smooth out amplitude changes
            const easingFactor = 0.1;
            smoothedAmplitude.current += (targetAmplitude - smoothedAmplitude.current) * easingFactor;
            const finalAmplitude = smoothedAmplitude.current;
            
            // Set styles for smoother lines and glow effect
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Wave 1 (Purple) - Primary wave
            ctx.beginPath();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#8b5cf6';
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 10;
            for (let x = 0; x < width; x++) {
                const primaryFreq = Math.sin(x * 0.025 + time);
                const secondaryFreq = Math.sin(x * 0.01 + time * 0.5);
                const y = height / 2 + (primaryFreq + secondaryFreq * 0.4) * (finalAmplitude * 0.7);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Wave 2 (Green) - Secondary, counter-moving wave
            ctx.beginPath();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#34d399';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 10;
            for (let x = 0; x < width; x++) {
                const primaryFreq = Math.sin(x * 0.02 - time * 0.8);
                const secondaryFreq = Math.sin(x * 0.005 - time * 0.2);
                const y = height / 2 + (primaryFreq + secondaryFreq * 0.5) * (finalAmplitude * 0.6);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            
            // Wave 3 (Subtle Blue) - A quiet, slow background wave
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#a5b4fc';
            ctx.shadowColor = '#a5b4fc';
            ctx.shadowBlur = 5;
            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin(x * 0.015 + time * 0.3) * (baseAmplitude * 1.5);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Reset shadow for next frame
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            animationFrameId.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [isOpen, audioLevel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center animate-fade-in">
            <button onClick={onClose} className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close live session">
                <ChevronDownIcon className="w-8 h-8 text-gray-500" />
            </button>

            <div className="w-full h-64">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-blue-50 via-green-50 to-transparent opacity-50"></div>

            <div className="absolute bottom-16 flex flex-col items-center">
                 <button 
                    onClick={onClose} 
                    className="w-24 h-24 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500" 
                    aria-label="Stop live session"
                >
                    <div className="relative w-20 h-20">
                        <div className="absolute -inset-1.5 bg-purple-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
                        <div className="relative w-full h-full bg-white rounded-full border-2 border-gray-200 flex items-center justify-center shadow-md">
                        </div>
                    </div>
                </button>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
};