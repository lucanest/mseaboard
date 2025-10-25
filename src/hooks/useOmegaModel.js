// src/hooks/useOmegaModel.js
import { useState, useEffect } from 'react';
import { InferenceSession, Tensor } from 'onnxruntime-web';

const NUCLEOTIDES = ['A', 'C', 'T', 'G', '-'];

// This function converts your MSA data into a one-hot encoded tensor
function msaToTensor(msa) {
    if (!msa || msa.length === 0) {
        throw new Error("MSA data is empty or invalid.");
    }
    const numSequences = msa.length;
    const seqLength = msa[0].sequence.length;

    // The model expects a flat Float32Array
    const tensorSize = 1 * 5 * numSequences * seqLength;
    const tensorData = new Float32Array(tensorSize);

    const nucleotideMap = new Map(NUCLEOTIDES.map((nuc, i) => [nuc, i]));

    for (let i = 0; i < numSequences; i++) {
        const sequence = msa[i].sequence.toUpperCase();
        for (let j = 0; j < seqLength; j++) {
            const char = sequence[j];
            const nucIndex = nucleotideMap.get(char) ?? nucleotideMap.get('-'); // Default to gap

            // Calculate the flat index for the [channel, seq_idx, char_idx] position
            const flatIndex = (nucIndex * numSequences * seqLength) + (i * seqLength) + j;
            tensorData[flatIndex] = 1;
        }
    }

    const dims = [1, 5, numSequences, seqLength];
    return new Tensor('float32', tensorData, dims);
}

export function useOmegaModel(modelPath) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadModel = async () => {
            setLoading(true);
            setError(null);
            try {
                // ONNX Runtime Web uses WebAssembly for performance.
                // 'wasm' is the recommended execution provider.
                const newSession = await InferenceSession.create(modelPath, {
                     executionProviders: ['wasm'],
                     graphOptimizationLevel: 'all',
                });
                setSession(newSession);
            } catch (e) {
                console.error("Failed to load ONNX model:", e);
                setError("Could not load the prediction model. " + e.message);
            }
            setLoading(false);
        };
        loadModel();
    }, [modelPath]);

    const predict = async (msa) => {
        if (!session) {
            throw new Error("Model session is not ready.");
        }
        if (msa[0].sequence.length % 3 !== 0) {
             throw new Error("Sequence length must be a multiple of 3 for codon-based prediction.");
        }

        const inputTensor = msaToTensor(msa);
        const feeds = { [session.inputNames[0]]: inputTensor };

        const results = await session.run(feeds);
        const outputTensor = results[session.outputNames[0]];
        
        // The model output is a tensor, we return it as a standard JS array
        return Array.from(outputTensor.data);
    };

    return { predict, loading, error };
}