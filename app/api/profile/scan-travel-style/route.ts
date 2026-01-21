import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExtensions = ['.pdf', '.txt', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF, TXT, or DOCX file.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // Extract text based on file type
    let extractedText = '';

    if (fileExtension === '.txt' || file.type === 'text/plain') {
      // For text files, read directly
      const text = await file.text();
      extractedText = text;
    } else if (fileExtension === '.pdf' || file.type === 'application/pdf') {
      // For PDF files, we would need a PDF parsing library
      // For now, return a placeholder message
      extractedText = '[PDF text extraction not yet implemented. This would require a PDF parsing library like pdf-parse or pdfjs-dist.]';
    } else if (fileExtension === '.docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For DOCX files, we would need a DOCX parsing library
      // For now, return a placeholder message
      extractedText = '[DOCX text extraction not yet implemented. This would require a DOCX parsing library like mammoth or docx.]';
    }

    return NextResponse.json({
      success: true,
      extractedText: extractedText || 'No text could be extracted from the file.',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error('[Profile API] Error processing file:', error);
    return NextResponse.json(
      { error: 'Failed to process file. Please try again.' },
      { status: 500 }
    );
  }
}
