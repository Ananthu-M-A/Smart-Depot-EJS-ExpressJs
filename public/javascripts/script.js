(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Product Quantity
    $('.quantity button').on('click', function () {
        var button = $(this);
        var oldValue = button.parent().parent().find('input').val();
        if (button.hasClass('btn-plus')) {
            var newVal = parseFloat(oldValue) + 1;
        } else {
            if (oldValue > 0) {
                var newVal = parseFloat(oldValue) - 1;
            } else {
                newVal = 0;
            }
        }
        button.parent().parent().find('input').val(newVal);
    });
    
})(jQuery);

(function($) {
  "use strict"; // Start of use strict

  // Toggle the side navigation
  $("#sidebarToggle, #sidebarToggleTop").on('click', function(e) {
    $("body").toggleClass("sidebar-toggled");
    $(".sidebar").toggleClass("toggled");
    if ($(".sidebar").hasClass("toggled")) {
      $('.sidebar .collapse').collapse('hide');
    };
  });

  // Close any open menu accordions when window is resized below 768px
  $(window).resize(function() {
    if ($(window).width() < 768) {
      $('.sidebar .collapse').collapse('hide');
    };
    
    // Toggle the side navigation when window is resized below 480px
    if ($(window).width() < 480 && !$(".sidebar").hasClass("toggled")) {
      $("body").addClass("sidebar-toggled");
      $(".sidebar").addClass("toggled");
      $('.sidebar .collapse').collapse('hide');
    };
  });

  // Prevent the content wrapper from scrolling when the fixed side navigation hovered over
  $('body.fixed-nav .sidebar').on('mousewheel DOMMouseScroll wheel', function(e) {
    if ($(window).width() > 768) {
      var e0 = e.originalEvent,
        delta = e0.wheelDelta || -e0.detail;
      this.scrollTop += (delta < 0 ? 1 : -1) * 30;
      e.preventDefault();
    }
  });

  // Scroll to top button appear
  $(document).on('scroll', function() {
    var scrollDistance = $(this).scrollTop();
    if (scrollDistance > 100) {
      $('.scroll-to-top').fadeIn();
    } else {
      $('.scroll-to-top').fadeOut();
    }
  });

  // Smooth scrolling using jQuery easing
  $(document).on('click', 'a.scroll-to-top', function(e) {
    var $anchor = $(this);
    $('html, body').stop().animate({
      scrollTop: ($($anchor.attr('href')).offset().top)
    }, 1000, 'easeInOutExpo');
    e.preventDefault();
  });

})(jQuery); // End of use strict


  function validateFormSignup() {

    const fullNameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const mobileInput = document.getElementById("mobile");
    const passwordInput = document.getElementById("password");
    const fullName = fullNameInput.value;
    const email = emailInput.value;
    const mobile = mobileInput.value;
    const password = passwordInput.value;

    const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    const mobilePattern = /^[0-9]{10}$/;
    const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!])[A-Za-z\d@#$%^&+=!]{6,}$/;
    let isValid = true;
    if ((fullName === "")||(!namePattern.test(fullName))) {
      isValid = false;
      alert("Full Name : Only alphabets & In between single spaces are allowed, Nothing Else.");
    }
    if (!emailPattern.test(email)) {
      isValid = false;
      alert("Email : Enter a valid Email(Eg:- user@example.com).");
    }
    if (!mobilePattern.test(mobile)) {
      isValid = false;
      alert("Enter a valid 10 digit mobile number.");
    }
    if ((password === "")||(!passwordPattern.test(password))) {
      isValid = false;
      alert("Password: It should contain atleast one uppercase, lowercase, digit & special character with min length of 6 characters without including spaces");
    }
    return isValid;
  }

  function validateFormLogin() {

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const email = emailInput.value;
    const password = passwordInput.value;

    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$/;
    const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!])[A-Za-z\d@#$%^&+=!]{6,}$/;
    let isValid = true;

    if (!emailPattern.test(email)) {
      isValid = false;
      alert("Please enter valid Email ID");
    }
    if ((password === "")||(!passwordPattern.test(password))) {
      isValid = false;
      alert("The password you've entered is incorrect.");
    }
    return isValid;
  }

  function validateFormFP() {

    const emailInput = document.getElementById("email");
    const email = emailInput.value;

    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$/;
    let isValid = true;

    if (!emailPattern.test(email)) {
      isValid = false;
      alert("Enter you Email in 'user@example.com' format.");
    }
    return isValid;
  }

  
  function validateFormOTP() {

    const otpInput = document.getElementById("otp");
    const otp = otpInput.value;

    const otpPattern = /^[0-9]{6}$/;
    let isValid = true;

    if (!otpPattern.test(otp)) {
      isValid = false;
      alert("Enter a valid 6 digit otp number.");
    }
    return isValid;
  }

  function validateFormOTPFP() {

    const otpInput = document.getElementById("otp");
    const otp = otpInput.value;

    const otpPattern = /^[0-9]{6}$/;
    let isValid = true;

    if (!otpPattern.test(otp)) {
      isValid = false;
      alert("Enter a valid 6 digit otp number.");
    }
    return isValid;
  }