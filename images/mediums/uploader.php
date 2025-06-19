<?php
// PHP Upload Logic
if (isset($_FILES['image'])) {
    // The target directory is the same directory where this script is located.
    $target_dir = __DIR__ . "/"; 
    $file_name = basename($_FILES["image"]["name"]);
    $target_file = $target_dir . $file_name;
    
    // Basic security checks
    $imageFileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));
    $allowed_types = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

    if (in_array($imageFileType, $allowed_types)) {
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
            // Send a success response
            http_response_code(200);
            echo "Success: " . htmlspecialchars($file_name);
            exit;
        } else {
            // Send an error response
            http_response_code(500);
            echo "Error: Could not move the uploaded file.";
            exit;
        }
    } else {
        // Send an error for invalid file type
        http_response_code(400);
        echo "Error: Invalid file type. Only JPG, JPEG, PNG, GIF, WEBP, and SVG are allowed.";
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Single File Image Uploader</title>
    <style>
        /* CSS for the page */
        body, html {
            height: 100%;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #f8f9fa;
            color: #343a40;
        }
        #upload-container {
            text-align: center;
        }
        #drop-zone {
            width: 400px;
            height: 250px;
            border: 3px dashed #adb5bd;
            border-radius: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            cursor: pointer;
            transition: border-color 0.3s, background-color 0.3s;
            background-color: #ffffff;
        }
        #drop-zone.dragover {
            border-color: #007bff;
            background-color: #e9ecef;
        }
        #drop-zone p {
            color: #6c757d;
            font-size: 1.2em;
            pointer-events: none; /* Make text non-interactive */
        }
        #status {
            margin-top: 20px;
            font-size: 0.9em;
            color: #6c757d;
        }
    </style>
</head>
<body>

<div id="upload-container">
    <h1>Drop Images Here</h1>
    <div id="drop-zone">
        <p>Drag & Drop</p>
    </div>
    <div id="status">Ready to upload.</div>
</div>

<script>
    // JavaScript for Drag and Drop
    const dropZone = document.getElementById('drop-zone');
    const statusDiv = document.getElementById('status');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length === 0) {
            statusDiv.textContent = 'No files dropped.';
            return;
        }
        statusDiv.textContent = 'Uploading...';
        // We handle one file at a time for simplicity, but you could loop
        for (const file of files) {
            uploadFile(file);
        }
    }

    function uploadFile(file) {
        // We upload to the current file itself, the PHP part will handle it
        const url = window.location.href; 
        const formData = new FormData();
        formData.append('image', file);

        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                // Get error message from the server response text
                return response.text().then(text => { throw new Error(text) });
            }
            return response.text();
        })
        .then(data => {
            statusDiv.innerHTML = `✅ Successfully uploaded: <strong>${file.name}</strong><br>Ready for next.`;
            console.log('Success:', data);
        })
        .catch(error => {
            // Display the error message from PHP
            statusDiv.innerHTML = `❌ ${error.message}`;
            console.error('Error:', error);
        });
    }
</script>

</body>
</html>
