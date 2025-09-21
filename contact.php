<?php
// Contact form handler
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
        // Email configuration
        $to = 'bhoomi@yahoo.com'; // Change this to your email
        $subject = 'New Contact Form Submission from ' . $name;
        $body = "Name: $name\n";
        $body .= "Email: $email\n";
        $body .= "Phone: $phone\n";
        $body .= "Message:\n$message";
        
        $headers = "From: $email\r\n";
        $headers .= "Reply-To: $email\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();
        
        // Send email
        if (mail($to, $subject, $body, $headers)) {
            echo json_encode(array('result' => 'success'));
        } else {
            echo json_encode(array('result' => 'error', 'errors' => array('mail' => 'Failed to send email')));
        }
    } else {
        echo json_encode(array('result' => 'error', 'errors' => $errors));
    }
} else {
    echo json_encode(array('result' => 'error', 'errors' => array('method' => 'Invalid request method')));
}
?>
