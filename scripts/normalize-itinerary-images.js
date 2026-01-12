#!/usr/bin/env node

/**
 * Normalize Itinerary Images Script
 * 
 * Audits and normalizes all image folders under /public/itinerary-images/
 * 
 * Rules:
 * - Folders with 3 or more .jpg files are normalized
 * - Files are renamed to: 1.jpg, 2.jpg, 3.jpg, ..., N.jpg
 * - Only .jpg files are processed (non-jpg files are ignored)
 * - Folders with <3 images are logged but not modified
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'itinerary-images');
const MIN_IMAGE_COUNT = 3; // Minimum images required for normalization
const EXCLUDE_FOLDERS = ['_default', '_themes'];

/**
 * Check if a file has a .jpg extension (case-insensitive)
 */
function isJpgFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg';
}

/**
 * Get all folders to process
 */
function getAllFolders() {
  const folders = [];
  
  // Get immediate child folders of IMAGES_DIR (country folders)
  try {
    const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !EXCLUDE_FOLDERS.includes(entry.name)) {
        folders.push(path.join(IMAGES_DIR, entry.name));
      }
    }
  } catch (error) {
    console.error(`Error reading ${IMAGES_DIR}:`, error.message);
    process.exit(1);
  }
  
  // Get theme folders
  const themesDir = path.join(IMAGES_DIR, '_themes');
  if (fs.existsSync(themesDir)) {
    try {
      const entries = fs.readdirSync(themesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          folders.push(path.join(themesDir, entry.name));
        }
      }
    } catch (error) {
      console.error(`Error reading ${themesDir}:`, error.message);
    }
  }
  
  return folders;
}

/**
 * Audit a folder and return its status
 */
function auditFolder(folderPath) {
  const folderName = path.relative(IMAGES_DIR, folderPath);
  const result = {
    path: folderPath,
    name: folderName,
    imageCount: 0,
    filenames: [],
    extensions: new Set(),
    status: 'UNKNOWN',
    error: null,
    needsRename: false,
  };
  
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const imageFiles = [];
    const nonJpgFiles = [];
    
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      
      const filename = entry.name;
      const ext = path.extname(filename).toLowerCase();
      result.extensions.add(ext);
      
      if (isJpgFile(filename)) {
        imageFiles.push(filename);
        result.imageCount++;
      } else {
        nonJpgFiles.push(filename);
      }
    }
    
    result.filenames = imageFiles.sort((a, b) => a.localeCompare(b));
    
    // Validation
    if (result.imageCount === 0) {
      result.status = 'ERROR_NO_IMAGES';
      result.error = `No images found (0 .jpg files)`;
      result.needsRename = false;
    } else if (result.imageCount < MIN_IMAGE_COUNT) {
      result.status = 'ERROR_TOO_FEW';
      result.error = `Too few images (found ${result.imageCount}, need at least ${MIN_IMAGE_COUNT})`;
      result.needsRename = false;
    } else {
      // Folder has ≥3 images, check if already normalized
      const expectedNames = [];
      for (let i = 1; i <= result.imageCount; i++) {
        expectedNames.push(`${i}.jpg`);
      }
      
      const isNormalized = expectedNames.every(name => result.filenames.includes(name)) &&
                          result.filenames.length === expectedNames.length;
      
      if (isNormalized) {
        result.status = 'NORMALIZED';
        result.needsRename = false;
      } else {
        result.status = 'NEEDS_RENAME';
        result.needsRename = true;
      }
    }
  } catch (error) {
    result.status = 'ERROR';
    result.error = `Failed to read folder: ${error.message}`;
    result.needsRename = false;
  }
  
  return result;
}

/**
 * Rename files in a folder to 1.jpg, 2.jpg, 3.jpg, ..., N.jpg
 * Uses safe two-pass method to avoid overwrites
 */
function renameFilesInFolder(folderPath, filenames) {
  const folderName = path.relative(IMAGES_DIR, folderPath);
  const renames = [];
  
  // Sort filenames alphabetically for deterministic ordering
  const sortedFiles = [...filenames].sort((a, b) => a.localeCompare(b));
  const imageCount = sortedFiles.length;
  
  // Generate expected names: 1.jpg, 2.jpg, 3.jpg, ..., N.jpg
  const expectedNames = [];
  for (let i = 1; i <= imageCount; i++) {
    expectedNames.push(`${i}.jpg`);
  }
  
  // Build mapping: which files need to be renamed to which names
  const renameMap = [];
  for (let i = 0; i < sortedFiles.length; i++) {
    const oldName = sortedFiles[i];
    const newName = expectedNames[i];
    
    if (oldName !== newName) {
      renameMap.push({ oldName, newName });
    }
  }
  
  // If no renames needed, return early
  if (renameMap.length === 0) {
    return renames;
  }
  
  // First pass: rename all files that need renaming to temporary names
  // This avoids conflicts when multiple files need to swap positions
  const tempRenames = [];
  for (const { oldName, newName } of renameMap) {
    const oldPath = path.join(folderPath, oldName);
    const tempName = `.temp_${Date.now()}_${Math.random().toString(36).substring(7)}_${oldName}`;
    const tempPath = path.join(folderPath, tempName);
    
    fs.renameSync(oldPath, tempPath);
    tempRenames.push({ tempPath, tempName, finalName: newName, originalName: oldName });
  }
  
  // Second pass: rename temp files to final names
  for (const { tempPath, tempName, finalName, originalName } of tempRenames) {
    const finalPath = path.join(folderPath, finalName);
    fs.renameSync(tempPath, finalPath);
    renames.push(`${folderName}: ${originalName} → ${finalName}`);
  }
  
  return renames;
}

/**
 * Format folder name for display
 */
function formatFolderName(folderPath) {
  return path.relative(IMAGES_DIR, folderPath);
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting itinerary images normalization audit...\n');
  console.log(`📁 Scanning: ${IMAGES_DIR}\n`);
  
  const folders = getAllFolders();
  console.log(`Found ${folders.length} folders to audit\n`);
  console.log('─'.repeat(80));
  console.log('');
  
  const results = {
    scanned: 0,
    normalized: 0,
    alreadyNormalized: 0,
    needsRename: 0,
    skipped: 0,
    errors: [],
    tooFew: [],
    noImages: [],
  };
  
  // Step 1 & 2: Discover and audit
  const auditResults = [];
  for (const folderPath of folders) {
    const audit = auditFolder(folderPath);
    auditResults.push(audit);
    results.scanned++;
    
    // Log audit result
    const folderName = formatFolderName(folderPath);
    console.log(`Folder: ${folderName}`);
    console.log(`- Image count: ${audit.imageCount}`);
    console.log(`- Filenames: [${audit.filenames.map(f => `"${f}"`).join(', ')}]`);
    console.log(`- Status: ${audit.status}`);
    
    if (audit.status === 'ERROR_NO_IMAGES') {
      console.log(`- Error: ${audit.error}`);
      results.skipped++;
      results.noImages.push({
        folder: folderName,
        count: audit.imageCount,
      });
      results.errors.push({
        folder: folderName,
        error: audit.error,
      });
    } else if (audit.status === 'ERROR_TOO_FEW') {
      console.log(`- Error: ${audit.error}`);
      results.skipped++;
      results.tooFew.push({
        folder: folderName,
        count: audit.imageCount,
      });
      results.errors.push({
        folder: folderName,
        error: audit.error,
      });
    } else if (audit.status === 'NORMALIZED') {
      console.log(`- ✓ Already normalized`);
      results.alreadyNormalized++;
    } else if (audit.status === 'NEEDS_RENAME') {
      console.log(`- ⚠ Needs normalization`);
      results.needsRename++;
    } else if (audit.error) {
      console.log(`- Error: ${audit.error}`);
      results.skipped++;
      results.errors.push({
        folder: folderName,
        error: audit.error,
      });
    }
    
    console.log('');
  }
  
  console.log('─'.repeat(80));
  console.log('');
  
  // Step 4: Rename files (only for folders that passed validation)
  if (results.needsRename > 0) {
    console.log('📝 Starting normalization...\n');
    
    for (const audit of auditResults) {
      if (audit.needsRename && audit.status === 'NEEDS_RENAME') {
        try {
          const renames = renameFilesInFolder(audit.path, audit.filenames);
          if (renames.length > 0) {
            console.log(`Renaming files in: ${audit.name}`);
            for (const rename of renames) {
              console.log(`  ✓ ${rename}`);
            }
            console.log('');
            results.normalized++;
            results.needsRename--;
          }
        } catch (error) {
          console.error(`  ✗ Error renaming files in ${audit.name}: ${error.message}`);
          results.skipped++;
          results.errors.push({
            folder: audit.name,
            error: `Rename failed: ${error.message}`,
          });
        }
      }
    }
    
    console.log('─'.repeat(80));
    console.log('');
  }
  
  // Step 6: Final report
  console.log('📊 FINAL REPORT');
  console.log('─'.repeat(80));
  console.log(`Total folders scanned: ${results.scanned}`);
  console.log(`Folders normalized: ${results.normalized}`);
  console.log(`Folders already normalized: ${results.alreadyNormalized}`);
  console.log(`Folders skipped due to <3 images: ${results.skipped}`);
  console.log('');
  
  if (results.tooFew.length > 0) {
    console.log('⚠️  Folders with too few images (<3):');
    for (const item of results.tooFew) {
      console.log(`  - ${item.folder}: ${item.count} image(s)`);
    }
    console.log('');
  }
  
  if (results.noImages.length > 0) {
    console.log('❌ Folders with no images:');
    for (const item of results.noImages) {
      console.log(`  - ${item.folder}: 0 images`);
    }
    console.log('');
  }
  
  // Show other errors (if any)
  const otherErrors = results.errors.filter(e => 
    !results.tooFew.some(tf => tf.folder === e.folder) &&
    !results.noImages.some(ni => ni.folder === e.folder)
  );
  if (otherErrors.length > 0) {
    console.log('❌ Other errors:');
    for (const error of otherErrors) {
      console.log(`  - ${error.folder}: ${error.error}`);
    }
    console.log('');
  }
  
  if (results.needsRename === 0 && results.skipped === 0) {
    console.log('✅ All folders are normalized!');
  } else if (results.needsRename === 0 && results.skipped > 0) {
    console.log(`✅ All eligible folders (≥${MIN_IMAGE_COUNT} images) are normalized!`);
    console.log(`ℹ️  ${results.skipped} folder(s) skipped due to insufficient images.`);
  } else {
    console.log('⚠️  Some folders still need normalization. Please review errors above.');
  }
  
  console.log('');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { auditFolder, renameFilesInFolder, getAllFolders };

