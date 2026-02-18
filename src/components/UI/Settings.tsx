import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { Camera, ChevronLeft, Check } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const Settings: React.FC = () => {
    const { faces, selectedFaceIndex, addFace, selectFace, setScreen } = useGameStore();
    const webcamRef = useRef<Webcam>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const capture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            addFace(imageSrc);
            setIsCameraOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setScreen('menu')} className="btn-secondary p-2 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-4xl font-bold">Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-morphism p-6 flex flex-col items-center gap-4">
                    <h3 className="text-xl font-semibold mb-2">Register Face</h3>

                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20 flex items-center justify-center border-2 border-dashed border-white/20">
                        {isCameraOpen ? (
                            <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                <button
                                    onClick={capture}
                                    className="absolute bottom-4 p-4 bg-primary rounded-full shadow-xl hover:scale-110 transition-transform"
                                >
                                    <Camera size={32} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsCameraOpen(true)}
                                className="btn-primary"
                            >
                                Open Camera
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-white/60">Capture your face to use on the character!</p>
                </div>

                <div className="glass-morphism p-6 flex flex-col gap-4">
                    <h3 className="text-xl font-semibold mb-2">Select Your Hero ({faces.length}/10)</h3>

                    <div className="grid grid-cols-4 gap-4 overflow-y-auto max-h-[300px] p-2">
                        {faces.map((face, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                                className="relative cursor-pointer"
                                onClick={() => selectFace(index)}
                            >
                                <img
                                    src={face}
                                    alt={`face ${index}`}
                                    className={`face-preview ${selectedFaceIndex === index ? 'selected' : ''}`}
                                />
                                {selectedFaceIndex === index && (
                                    <div className="absolute -top-1 -right-1 bg-accent text-dark p-1 rounded-full">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {faces.length === 0 && (
                            <div className="col-span-4 h-32 flex items-center justify-center text-white/20 border-2 border-dashed border-white/10 rounded-xl">
                                No faces registered
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
