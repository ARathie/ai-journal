# Audio Upload API Documentation

## Base URL
`http://localhost:3000/api`

## Endpoints

### 1. Upload Audio File
- **URL:** `/uploadTest`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body Parameter:** 
  - `audio`: Audio file (required)
- **Supported File Types:**
  - `.mp3` (audio/mpeg)
  - `.wav` (audio/wav)
  - `.m4a` (audio/m4a, audio/x-m4a)
  - `.mp4` (audio/mp4)
  - `.aac` (audio/aac)
- **Size Limit:** 50MB
- **Success Response:**
  ```json
  {
    "key": "audio/2024/01/1738104822099-audiofile.m4a"
  }
  ```
- **Error Response:**
  ```json
  {
    "error": "Upload failed",
    "details": "Error message"
  }
  ```

### 2. Get Signed URL
- **URL:** `/test-file/:key`
- **Method:** `GET`
- **Parameters:**
  - `key`: Full path to file (URL encoded)
- **Success Response:**
  ```json
  {
    "signedUrl": "https://bucket-name.s3.region.amazonaws.com/path/to/file?..."
  }
  ```
- **Error Response:**
  ```json
  {
    "error": "Failed to get signed URL",
    "details": "Error message"
  }
  ```
- **URL Expiration:** 1 hour

### 3. Test AWS Connection
- **URL:** `/test-aws`
- **Method:** `GET`
- **Success Response:**
  ```json
  {
    "success": true,
    "buckets": ["bucket1", "bucket2"]
  }
  ```
- **Error Response:**
  ```json
  {
    "error": "AWS Test Failed",
    "details": "Error message"
  }
  ```

## Example Usage

### Upload File
```bash
curl -X POST -F "audio=@/path/to/audio.m4a" http://localhost:3000/api/uploadTest
```

### Get Signed URL
```bash
curl "http://localhost:3000/api/test-file/audio/2024/01/filename.m4a"
```

### Test Connection
```bash
curl http://localhost:3000/api/test-aws
```
```
