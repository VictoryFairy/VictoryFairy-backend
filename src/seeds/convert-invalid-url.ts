import * as fs from 'fs';
import * as path from 'path';

function convertYouTubeURL(url: string): string {
    const regex = /https:\/\/youtu\.be\/(.+)/;
    const match = url.match(regex);
    
    if (match && match[1]) {
        return `https://www.youtube.com/watch?v=${match[1]}`;
    } else {
        throw new Error("Invalid YouTube URL format");
    }
}

function cleanYouTubeURL(url: string): string {
  try {
      const urlObj = new URL(url);
      const videoID = urlObj.searchParams.get('v');
      const timestamp = urlObj.searchParams.get('t');
      
      if (videoID) {
          let cleanURL = `https://www.youtube.com/watch?v=${videoID}`;
          if (timestamp) {
              cleanURL += `&t=${timestamp}`;
          }
          return cleanURL;
      } else {
          throw new Error("URL does not contain a 'v' parameter");
      }
  } catch (error) {
      throw new Error(`Invalid URL: ${error.message}`);
  }
}

function traverseAndConvertLinks(obj: any): void {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key === 'link' && typeof obj[key] === 'string') {
                try {
                    obj[key] = cleanYouTubeURL(obj[key]);
                } catch (error) {
                    console.error(`Error converting URL for key "${key}": ${error.message}`);
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                traverseAndConvertLinks(obj[key]);
            }
        }
    }
}

function processJSONFile(filePath: string): void {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file from disk: ${err}`);
        } else {
            try {
                const jsonObject = JSON.parse(data);
                traverseAndConvertLinks(jsonObject);
                fs.writeFile(filePath, JSON.stringify(jsonObject, null, 2), (err) => {
                    if (err) {
                        console.error(`Error writing file to disk: ${err}`);
                    } else {
                        console.log(`File has been saved with converted URLs: ${filePath}`);
                    }
                });
            } catch (err) {
                console.error(`Error parsing JSON string: ${err}`);
            }
        }
    });
}

function processAllJSONFilesInFolder(folderPath: string): void {
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error(`Unable to scan directory: ${err}`);
            return;
        }
        
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            if (path.extname(filePath) === '.json') {
                processJSONFile(filePath);
            }
        });
    });
}

// Example usage
const folderPath = './src/seeds/raw-cheering-songs';
processAllJSONFilesInFolder(folderPath);
