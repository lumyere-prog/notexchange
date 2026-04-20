document.addEventListener('DOMContentLoaded', function() {

    const signUpLink = document.querySelector('.sign-up-link');
    const backToLoginLinks = document.querySelectorAll('.back-to-login');
    const forgotPasswordLink = document.querySelector('.forgot-password');

    const loginPage = document.querySelector('.login');
    const signupPage = document.getElementById('signup-page');
    const forgotPage = document.getElementById('forgot-page');


    if (signUpLink && loginPage && signupPage) {

        // SHOW SIGNUP
        signUpLink.addEventListener('click', function(e){
            e.preventDefault();

            loginPage.style.display = 'none';
            signupPage.style.display = 'flex';

            history.pushState({page:'signup'}, '', '#signup');
        });


        // BACK TO LOGIN
        backToLoginLinks.forEach(link => {
            link.addEventListener('click', function(e){
                e.preventDefault();

                signupPage.style.display = 'none';
                forgotPage.style.display = 'none';
                loginPage.style.display = 'flex';

                 history.pushState({page:'login'}, '', '#login');
            });
        });


        // OPEN FORGOT PASSWORD
        forgotPasswordLink.addEventListener('click', function(e){
            e.preventDefault();

            loginPage.style.display = 'none';
            forgotPage.style.display = 'flex';

            history.pushState({page:'forgot'}, '', '#forgot');
        });

    } else {
        console.error("One or more elements not found! Check your HTML classes/IDs.");
    }

       // PHONE BACK BUTTON
    window.onpopstate = function(event){

        if(!event.state || event.state.page === 'login'){
            loginPage.style.display = 'flex';
            signupPage.style.display = 'none';
            forgotPage.style.display = 'none';
        }

        if(event.state && event.state.page === 'signup'){
            loginPage.style.display = 'none';
            signupPage.style.display = 'flex';
            forgotPage.style.display = 'none';
        }

        if(event.state && event.state.page === 'forgot'){
            loginPage.style.display = 'none';
            signupPage.style.display = 'none';
            forgotPage.style.display = 'flex';
        }
    };

    async function askAI() {
  const res = await fetch('http://localhost:3000/chatbot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: "Explain derivatives in simple terms",
      userID: "PUT_USER_ID_HERE"
    })
  });

  const data = await res.json();
  console.log(data);
}

});

