#!/usr/bin/env node

/**
 * One-time cleanup script for itinerary images
 * 
 * Tasks:
 * 1. Delete all non-.jpg/.jpeg files (png, webp, avif, jfif, etc.)
 * 2. Convert .jpeg files to .jpg
 * 3. Rename all .jpg files sequentially (1.jpg, 2.jpg, 3.jpg, ...) sorted alphabetically
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'itinerary-images');

// Extensions to keep (will be converted to .jpg)
const KEEP_EXTENSIONS = ['.jpg', '.jpeg'];
// Extensions to delete
const DELETE_EXTENSIONS = ['.png', '.webp', '.avif', '.jfif', '.txt', '.JPG', '.JPEG'];

function getAllFolders(dir) {
  const folders = [];
  
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        folders.push(fullPath);
        scan(fullPath);
      }
    }
  }
  
  scan(dir);
  return folders;
}

function cleanupFolder(folderPath) {
  const files = fs.readdirSync(folderPath);
  const imageFiles = [];
  const filesToDelete = [];
  
  // Categorize files
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    
    // Skip directories
    if (fs.statSync(fullPath).isDirectory()) {
      continue;
    }
    
    const ext = path.extname(file).toLowerCase();
    
    if (KEEP_EXTENSIONS.includes(ext)) {
      imageFiles.push(file);
    } else if (DELETE_EXTENSIONS.includes(ext) || ext === '') {
      filesToDelete.push(fullPath);
    } else {
      // Unknown extension - log but don't delete
      console.log(`  ⚠️  Unknown extension: ${file} (${ext})`);
    }
  }
  
  // Step 1: Delete non-image files
  for (const filePath of filesToDelete) {
    try {
      fs.unlinkSync(filePath);
      console.log(`  ❌ Deleted: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`  ✗ Failed to delete ${filePath}:`, error.message);
    }
  }
  
  if (imageFiles.length === 0) {
    return;
  }
  
  // Step 2: Sort image files alphabetically by filename
  imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  
  // Step 3: Rename sequentially using temp names to avoid collisions
  const tempFiles = [];
  
  // First pass: Rename all to temp names
  for (let i = 0; i < imageFiles.length; i++) {
    const oldFile = path.join(folderPath, imageFiles[i]);
    const tempName = `.temp_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.jpg`;
    const tempPath = path.join(folderPath, tempName);
    
    try {
      // If file is .jpeg, we'll handle it in the rename
      const ext = path.extname(imageFiles[i]).toLowerCase();
      if (ext === '.jpeg') {
        // Read and write as .jpg
        const buffer = fs.readFileSync(oldFile);
        fs.writeFileSync(tempPath, buffer);
        fs.unlinkSync(oldFile);
      } else {
        // Just rename
        fs.renameSync(oldFile, tempPath);
      }
      tempFiles.push(tempPath);
    } catch (error) {
      console.error(`  ✗ Failed to create temp file for ${imageFiles[i]}:`, error.message);
    }
  }
  
  // Second pass: Rename temp files to final names
  for (let i = 0; i < tempFiles.length; i++) {
    const tempPath = tempFiles[i];
    const finalName = `${i + 1}.jpg`;
    const finalPath = path.join(folderPath, finalName);
    
    try {
      fs.renameSync(tempPath, finalPath);
      console.log(`  ✓ Renamed to: ${finalName}`);
    } catch (error) {
      console.error(`  ✗ Failed to rename ${tempPath} to ${finalName}:`, error.message);
    }
  }
}

function main() {
  console.log('🧹 Starting itinerary images cleanup...\n');
  
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`✗ Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }
  
  // Get all folders (including root)
  const folders = [IMAGES_DIR, ...getAllFolders(IMAGES_DIR)];
  
  console.log(`Found ${folders.length} folders to process\n`);
  
  for (const folder of folders) {
    const relativePath = path.relative(IMAGES_DIR, folder);
    const displayPath = relativePath || '(root)';
    
    console.log(`📁 Processing: ${displayPath}`);
    
    try {
      cleanupFolder(folder);
    } catch (error) {
      console.error(`  ✗ Error processing folder:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('✅ Cleanup complete!');
}

main();


