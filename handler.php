<?php
// Alternative contact form handler
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get form data
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
    $message = isset($_POST['message']) ? trim($_POST['message']) : '';
    
    // Basic validation
    $errors = array();
    
    if (empty($name)) {
        $errors['name'] = 'Name is required';
    }
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Valid email is required';
    }
    
    if (empty($phone)) {
        $errors['phone'] = 'Phone is required';
    }
    
    if (empty($message)) {
        $errors['message'] = 'Message is required';
    }
    
    // If no errors, process the form
    if (empty($errors)) {
        // For demo purposes, we'll just return success
        // In a real application, you would send an email or save to database
        echo json_encode(array('result' => 'success'));
    } else {
        echo json_encode(array('result' => 'error', 'errors' => $errors));
    }
} else {
    echo json_encode(array('result' => 'error', 'errors' => array('method' => 'Invalid request method')));
}
?>
