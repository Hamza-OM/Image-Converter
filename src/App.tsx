import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileImage, Upload, Download, Moon, Sun, X, ArrowUp, ArrowDown, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Document, Page, pdf, StyleSheet, View } from '@react-pdf/renderer';
import { Image } from '@react-pdf/renderer';

function App() {
  const [images, setImages] = useState<Array<{ id: string; url: string; size: number }>>([]);
  const [fileName, setFileName] = useState('converted-images');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const newWindowRef = useRef<Window | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

  const getTotalSize = () => images.reduce((acc, img) => acc + img.size, 0);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  }, []);

  const processFiles = async (files: File[]) => {
    setError(null);
    setUploading(true);
    
    const newTotalSize = getTotalSize() + files.reduce((acc, file) => acc + file.size, 0);
    if (newTotalSize > MAX_TOTAL_SIZE) {
      setError('Total file size exceeds 50MB limit');
      setUploading(false);
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('Individual image size should be less than 10MB');
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        setImages(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          url: dataUrl,
          size: file.size
        }]);
      } catch (err) {
        setError('Error reading file');
      }
    }
    setUploading(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const removeImage = (idToRemove: string) => {
    setImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === images.length - 1)) return;

    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setImages(newImages);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Create styles for PDF
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 0,
      margin: 0
    },
    imageContainer: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    image: {
      objectFit: 'contain',
      maxWidth: '100%',
      maxHeight: '100%'
    }
  });

  // Function to convert any image to PNG format
  const convertImageToPNG = async (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        try {
          // Create a canvas to draw the image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the image on the canvas
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'white'; // Set white background
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Convert to PNG format
          const pngUrl = canvas.toDataURL('image/png');
          resolve(pngUrl);
        } catch (err) {
          console.error('Error converting image to PNG:', err);
          resolve(imageUrl); // Fall back to original if conversion fails
        }
      };
      
      img.onerror = () => {
        console.error('Error loading image for conversion');
        resolve(imageUrl); // Fall back to original if loading fails
      };
      
      // Set the source to start loading
      img.src = imageUrl;
    });
  };

  // Function to detect mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Function to detect iOS device
  const isIOSDevice = () => {
    return /iPad|iPhone|iPod/i.test(navigator.userAgent);
  };

  // Function to detect Safari browser
  const isSafariBrowser = () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  };

  // Effect to handle PDF opening in iOS
  useEffect(() => {
    if (pdfUrl && isIOSDevice()) {
      // Open in a new window
      newWindowRef.current = window.open(pdfUrl, '_blank');
      
      // If window.open was blocked or failed, we'll still have the fallback link
      if (!newWindowRef.current) {
        console.error('Failed to open PDF in new window. Popup might be blocked.');
      }
    }
    
    // Cleanup function
    return () => {
      if (pdfUrl) {
        // Revoke the object URL when component unmounts or pdfUrl changes
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Function to handle PDF download
  const handleDownloadPDF = async () => {
    try {
      // Show loading state
      setUploading(true);
      setError(null);
      
      // Clear any previous PDF URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      
      // Pre-process all images to PNG format
      const processedImages = await Promise.all(
        images.map(async (image) => {
          try {
            const processedUrl = await convertImageToPNG(image.url);
            return {
              ...image,
              processedUrl
            };
          } catch (err) {
            console.error(`Error processing image ${image.id}:`, err);
            return {
              ...image,
              processedUrl: image.url // Fall back to original URL
            };
          }
        })
      );
      
      // Create a modified PDFDocument component with processed images
      const ProcessedPDFDocument = () => (
        <Document>
          {processedImages.map(image => (
            <Page key={image.id} size="A4" style={styles.page}>
              <View style={styles.imageContainer}>
                <Image src={image.processedUrl} style={styles.image} />
              </View>
            </Page>
          ))}
        </Document>
      );
      
      // Generate the PDF blob
      const blob = await pdf(<ProcessedPDFDocument />).toBlob();
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Store the URL in state - this will trigger the useEffect
      setPdfUrl(url);
      
      // For non-iOS devices, use the standard download approach
      if (!isIOSDevice()) {
        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = url;
          downloadLinkRef.current.download = `${fileName || 'converted-images'}.pdf`;
          downloadLinkRef.current.click();
        }
      }
      // For iOS devices, the useEffect will handle opening the PDF
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('There was an error generating the PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const totalSize = getTotalSize();
  const sizePercentage = (totalSize / MAX_TOTAL_SIZE) * 100;

  return (
    <div className={`min-h-[100dvh] ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center p-4 relative transition-colors`}>
      <button
        onClick={() => setDarkMode(prev => !prev)}
        className={`absolute top-4 right-4 p-2 rounded-full ${
          darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
        } shadow-lg`}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className={`${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-md transition-colors`}>
        <div className="text-center mb-6 sm:mb-8">
          <FileImage className={`w-10 h-10 sm:w-12 sm:h-12 ${
            darkMode ? 'text-blue-400' : 'text-blue-500'
          } mx-auto mb-3 sm:mb-4`} />
          <h1 className={`text-xl sm:text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>Image to PDF Converter</h1>
          <p className={`text-sm sm:text-base ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          } mt-2`}>Convert your images to PDF format easily</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : darkMode 
                  ? 'border-gray-600 bg-gray-700'
                  : 'border-gray-300'
            }`}
          >
            <label className="cursor-pointer block touch-manipulation">
              {uploading ? (
                <Loader2 className={`w-7 h-7 sm:w-8 sm:h-8 ${
                  darkMode ? 'text-gray-400' : 'text-gray-400'
                } mx-auto mb-2 animate-spin`} />
              ) : (
                <Upload className={`w-7 h-7 sm:w-8 sm:h-8 ${
                  darkMode ? 'text-gray-400' : 'text-gray-400'
                } mx-auto mb-2`} />
              )}
              <span className={`text-sm sm:text-base ${
                darkMode ? 'text-gray-300' : 'text-gray-500'
              }`}>
                <span className="hidden sm:inline">Click to upload or drag and drop</span>
                <span className="sm:hidden">Tap to upload photos</span>
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                multiple
                disabled={uploading}
              />
            </label>
          </div>

          {images.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                    Total Size: {formatFileSize(totalSize)}
                  </span>
                  <span className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                    {formatFileSize(MAX_TOTAL_SIZE)} max
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      sizePercentage > 90 ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${sizePercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {images.map((image, index) => (
                  <div 
                    key={image.id} 
                    className={`relative rounded-lg overflow-hidden ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}
                  >
                    <img 
                      src={image.url} 
                      alt="Preview" 
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        onClick={() => removeImage(image.id)}
                        className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      {index > 0 && (
                        <button
                          onClick={() => moveImage(index, 'up')}
                          className="p-1 rounded-full bg-gray-800/70 text-white hover:bg-gray-800"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          onClick={() => moveImage(index, 'down')}
                          className="p-1 rounded-full bg-gray-800/70 text-white hover:bg-gray-800"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="absolute bottom-1 left-1">
                      <span className="text-xs bg-gray-800/70 text-white px-2 py-1 rounded-full">
                        {formatFileSize(image.size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter file name"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                />

                <button
                  onClick={handleDownloadPDF}
                  disabled={uploading}
                  className={`inline-flex w-full min-h-[44px] items-center justify-center gap-2 px-4 py-2 ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                  } text-white rounded-lg transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                      <span className="text-sm sm:text-base whitespace-nowrap">
                        Generating PDF...
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm sm:text-base whitespace-nowrap">
                        Download PDF
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Hidden elements for downloads */}
        <a 
          ref={downloadLinkRef} 
          style={{ display: 'none' }}
          href="#"
          download="converted-images.pdf"
        />
        
        {pdfUrl && isIOSDevice() && !newWindowRef.current && (
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
            <p>If the PDF didn't open automatically, <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">click here</a> to view it.</p>
          </div>
        )}
        
        <div className="text-center mt-6">
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>made by @hamzaalsiyabi</p>
        </div>
      </div>
    </div>
  );
}

export default App;