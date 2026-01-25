"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [profileScanResult, setProfileScanResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const validExtensions = ['.pdf', '.txt', '.docx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setErrorMessage('Please select a PDF, TXT, or DOCX file.');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setErrorMessage(null);
      setUploadStatus('idle');
      setExtractedText(null);
      setProfileScanResult(null);
    }
  };

  const handleScanTravelStyle = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first.');
      return;
    }

    setUploadStatus('uploading');
    setErrorMessage(null);
    setExtractedText(null);
    setProfileScanResult(null);

    try {
      // First, extract text from file
      let extractedText = '';
      
      if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt')) {
        extractedText = await selectedFile.text();
      } else {
        // For PDF/DOCX, use the existing extraction endpoint
        const formData = new FormData();
        formData.append('file', selectedFile);

        const extractResponse = await fetch('/api/profile/scan-travel-style', {
          method: 'POST',
          body: formData,
        });

        if (!extractResponse.ok) {
          const errorData = await extractResponse.json().catch(() => ({ error: 'Failed to process file' }));
          throw new Error(errorData.error || 'Failed to extract text from file');
        }

        const extractData = await extractResponse.json();
        extractedText = extractData.extractedText || '';
        
        // Check if extraction returned a placeholder/error message
        if (extractedText.includes('not yet implemented') || 
            extractedText.includes('would require') ||
            extractedText.startsWith('[') && extractedText.includes('not yet')) {
          throw new Error('Text extraction is not yet implemented for this file type. Please use a .txt file for now.');
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the file.');
      }

      // Then, scan the extracted text for travel preferences
      const scanResponse = await fetch('/api/agent/profile-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extractedText }),
      });

      if (!scanResponse.ok) {
        const errorData = await scanResponse.json().catch(() => ({ error: 'Failed to scan travel style' }));
        throw new Error(errorData.error || 'Failed to scan travel style');
      }

      const scanData = await scanResponse.json();
      
      // Store the raw JSON response
      setProfileScanResult(scanData);
      
      // Don't set extractedText - we'll display it in a user-friendly format instead
      setUploadStatus('success');
    } catch (error) {
      console.error('[Profile] Error scanning travel style:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to scan travel style. Please try again.');
      setUploadStatus('error');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <>
      <StepHeader title="My Profile" currentStep={1} totalSteps={1} onBack={handleBack} />
      <main className="flex flex-col min-h-[100dvh] bg-gray-900">
        <div className="max-w-md mx-auto w-full bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 min-h-[100dvh] flex flex-col">
          <div className="px-6 py-6 pt-[120px] pb-24 flex flex-col flex-1">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Travel Style Scanner</h1>
            <p className="text-sm text-gray-600 mb-6">
              Upload a document (PDF, TXT, or DOCX) to analyze your travel preferences and style.
            </p>

            {/* File Upload Section */}
            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:border-[#FE4C40] hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {selectedFile ? (
                    <>
                      <FileText className="w-12 h-12 text-[#FE4C40] mb-3" />
                      <p className="text-sm font-medium text-gray-900 mb-1">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, TXT, or DOCX (MAX. 10MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                />
              </label>

              {errorMessage && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScanTravelStyle}
              disabled={!selectedFile || uploadStatus === 'uploading'}
              className="w-full py-3 px-4 bg-[#FE4C40] text-white font-semibold rounded-lg hover:bg-[#E63C30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <span>Scan my travel style</span>
              )}
            </button>

            {/* Travel Style Results Display */}
            {profileScanResult && (
              <div className="mt-6 space-y-4">
                {/* Summary Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Travel Style</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Analyzed from</p>
                      <p className="text-sm font-medium text-gray-900">{profileScanResult.inferredFrom}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Overall confidence</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        profileScanResult.confidence === 'high' 
                          ? 'bg-green-100 text-green-800' 
                          : profileScanResult.confidence === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {profileScanResult.confidence.charAt(0).toUpperCase() + profileScanResult.confidence.slice(1)} confidence
                      </span>
                    </div>
                  </div>
                </div>

                {/* Traits Card */}
                {profileScanResult.traits && profileScanResult.traits.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Preferences</h3>
                    <div className="space-y-4">
                      {profileScanResult.traits.map((trait: any, index: number) => {
                        // Format trait name to be more readable
                        const formattedName = trait.name
                          .split('_')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                        
                        return (
                          <div key={index} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-base font-medium text-gray-900">{formattedName}</h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-2 ${
                                trait.confidence === 'high' 
                                  ? 'bg-green-100 text-green-800' 
                                  : trait.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {trait.confidence}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{trait.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evidence Snippets Card */}
                {profileScanResult.evidenceSnippets && profileScanResult.evidenceSnippets.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">What We Found</h3>
                    <div className="space-y-3">
                      {profileScanResult.evidenceSnippets.map((snippet: any, index: number) => {
                        // Format trait name for display
                        const formattedTrait = snippet.trait
                          .split('_')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                        
                        return (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border-l-4 border-[#FE4C40]">
                            <p className="text-xs font-medium text-gray-600 mb-1">{formattedTrait}</p>
                            <p className="text-sm text-gray-800 italic">&ldquo;{snippet.text}&rdquo;</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {uploadStatus === 'success' && !extractedText && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-800">File processed successfully!</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </main>
      <Footer activeTab="profile" />
    </>
  );
}
