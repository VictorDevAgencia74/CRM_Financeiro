document.addEventListener("DOMContentLoaded", () => {
    const supabaseUrl = "https://puvtyjbqgtcnwtwaglbd.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dnR5amJxZ3Rjbnd0d2FnbGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwMjYxNDEsImV4cCI6MjA1NDYwMjE0MX0.S_ipesriHFKfJD95bakODI_8NZle590UJVO4b0l2okU";

    if (!window.supabase) {
        console.error("O Supabase não está definido. Verifique se o script '@supabase/supabase-js' foi carregado.");
        return;
    }

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Obtém o formulário de login
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        console.error("Elemento #loginForm não encontrado. Certifique-se de que ele exista no HTML.");
        return;
    }

    // Adiciona o evento de submit ao formulário
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw new Error(error.message);

            alert("Login bem-sucedido!");
            window.location.href = "index.html"; // Redireciona para o admin após login bem-sucedido
        } catch (err) {
            alert("Erro ao fazer login: " + err.message);
        }
    });
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                alert("Erro ao sair: " + error.message);
            } else {
                alert("Você saiu com sucesso!");
                window.location.href = "login.html";
            }
        });
    }   
});