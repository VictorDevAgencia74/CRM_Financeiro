document.addEventListener("DOMContentLoaded", async () => {
    const supabaseUrl = "https://puvtyjbqgtcnwtwaglbd.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dnR5amJxZ3Rjbnd0d2FnbGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwMjYxNDEsImV4cCI6MjA1NDYwMjE0MX0.S_ipesriHFKfJD95bakODI_8NZle590UJVO4b0l2okU";
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    try {
        console.log("Verificando sessão ativa...");
        const { data: session, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.session) {
            console.warn("Nenhuma sessão ativa encontrada. Redirecionando para login...");
            window.location.href = "login.html";
            return;
        }

        console.log("Sessão ativa encontrada.");

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error("Erro ao obter usuário autenticado:", userError.message);
            throw userError;
        }

        if (!user) {
            console.warn("Nenhum usuário autenticado encontrado. Redirecionando para login...");
            window.location.href = "login.html";
            return;
        }

        console.log("Autenticação verificada com sucesso.");

        // Popula o <select> de bancos
        await populateSelect(user);

        // Adiciona um listener para o <select> de tipo de transação
        document.getElementById('transaction-type').addEventListener('change', async (event) => {
            const tipoSelecionado = event.target.value;
            await populateCategorySelect(user, tipoSelecionado);
        });

    } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
        alert("Ocorreu um erro ao verificar a autenticação. Por favor, tente novamente.");
        window.location.href = "login.html";
    }

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

    // Listener para o campo de seleção de data
    document.getElementById('dataSelecionada').addEventListener('change', async (event) => {
        const dataSelecionada = event.target.value;

        // Verifica se há uma data selecionada
        if (dataSelecionada) {
            const { data: { user } } = await supabase.auth.getUser();

            // Atualiza as tabelas de receitas e despesas com a data selecionada
            await exibirCategoriasReceitas(user, dataSelecionada);
            await exibirCategoriasDespesas(user, dataSelecionada);
        }
    });

    // Função para popular o <select> de bancos
    async function populateSelect(user) {
        const selectElement = document.getElementById('bank-select');
        if (!selectElement) {
            console.error("Elemento 'bank-select' não encontrado no HTML.");
            return;
        }

        // Busca os bancos filtrados pelo user_id
        const { data, error } = await supabase
            .from('banks')
            .select('id, name') // Seleciona o id e o nome
            .eq('user_id', user.id);

        if (error) {
            console.error('Erro ao buscar dados dos bancos:', error);
            return;
        }

        // Limpa o <select> antes de popular
        selectElement.innerHTML = '';

        // Adiciona uma opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione um banco';
        selectElement.appendChild(defaultOption);

        // Popula o <select> com os bancos
        data.forEach(bank => {
            const option = document.createElement('option');
            option.value = bank.id; // Usa o id como valor
            option.textContent = bank.name; // Exibe o nome no dropdown
            selectElement.appendChild(option);
        });
    }

    // Função para popular o <select> de categorias com base no tipo de transação
    async function populateCategorySelect(user, tipoTransacao) {
        const selectElement = document.getElementById('category-select');
        if (!selectElement) {
            console.error("Elemento 'category-select' não encontrado no HTML.");
            return;
        }

        // Busca as categorias filtradas pelo user_id e tipo de transação
        const { data, error } = await supabase
            .from('categories')
            .select('id, name') // Seleciona o id e o nome
            .eq('user_id', user.id)
            .eq('type', tipoTransacao);

        if (error) {
            console.error('Erro ao buscar dados das categorias:', error);
            return;
        }

        // Limpa o <select> antes de popular
        selectElement.innerHTML = '';

        // Adiciona uma opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione uma categoria';
        selectElement.appendChild(defaultOption);

        // Popula o <select> com as categorias
        data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id; // Usa o id como valor
            option.textContent = category.name; // Exibe o nome no dropdown
            selectElement.appendChild(option);
        });
    }

    // Função para adicionar Transações (tabela transactions)
    document.getElementById('form-transacao').addEventListener('submit', async (event) => {
      event.preventDefault();

      // Captura dos dados do formulário
      const valor = document.getElementById('valor').value.trim();
      const descricao = document.getElementById('descricao').value.trim();
      const bankId = document.getElementById('bank-select').value;
      const dataTransacao = document.getElementById('data-transacao').value;
      const tipoTransacao = document.getElementById('transaction-type').value;
      const categoriaId = document.getElementById('category-select').value;

      // Validação dos campos obrigatórios
      if (!valor || !descricao || !dataTransacao || !tipoTransacao || !bankId || !categoriaId) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      // Obter o user_id do usuário logado
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert('Erro ao obter usuário logado. Faça login novamente.');
        console.error('Erro na autenticação:', authError);
        return;
      }

      const userId = user.id;

      // Preparar os dados para inserção
      const transactionData = {
        amount: parseFloat(valor),
        description: descricao,
        bank_id: bankId ? parseInt(bankId) : null,
        date: dataTransacao,
        type: tipoTransacao,
        category_id: categoriaId ? parseInt(categoriaId) : null,
        user_id: userId,
      };

      // Inserir os dados no Supabase
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData]);

      if (error) {
        alert('Erro ao salvar transação. Tente novamente.');
        console.error('Erro ao salvar transação:', error);
        return;
      }

      console.log('Transação salva com sucesso:', data);
      
      //  5. Exibir mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Transação Financeira salva com sucesso.',
        confirmButtonColor: '#28a745',
      });
        
    
      // Reset do formulário   
      document.getElementById('form-transacao').reset();
      document.getElementById('valor').focus();
    });
    // Atualizar a página ao clicar em "Close"
    document.getElementById('btn-close').addEventListener('click', () => {
      window.location.href = 'index.html'; // Atualiza a página
    });

    // Captura do formulário e submissão
    document.getElementById('form-categories').addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('categorie-name').value.trim();
      const tipoCategoria = document.getElementById('categorie-type').value;

      // Função para adicionar Categorias (tabela categories)
      //  1. Validação: Campos obrigatórios
      if (!name || !tipoCategoria) {
        Swal.fire({
          icon: 'warning',
          title: 'Atenção!',
          text: 'Por favor, preencha todos os campos obrigatórios.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      //  2. Obter usuário logado
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Erro na autenticação:", authError);
        Swal.fire({
          icon: 'error',
          title: 'Erro de Autenticação',
          text: 'Erro ao obter usuário logado. Faça login novamente.',
          confirmButtonColor: '#d33',
        });
        return;
      }

      console.log("Usuário logado:", user);

      const userId = user.id;

      //  3. Preparar os dados para inserção
      const categoriesData = {
        name: name,
        type: tipoCategoria,
        user_id: userId,
      };

      console.log("Dados a serem inseridos:", categoriesData);

      //  4. Inserir no Supabase
      const { data, error } = await supabase
        .from('categories')
        .insert([categoriesData]);

      if (error) {
        console.error("Erro ao salvar categoria:", error);
        Swal.fire({
          icon: 'error',
          title: 'Erro ao Salvar',
          text: 'Não foi possível salvar a categoria. Tente novamente.',
          confirmButtonColor: '#d33',
        });
        return;
      }

      console.log("Categoria salva com sucesso:", data);

      //  5. Exibir mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Categoria salva com sucesso.',
        confirmButtonColor: '#28a745',
      });

      //  6. Reset do formulário
      document.getElementById('form-categories').reset();
      document.getElementById('categorie-name').focus();
    });

     // Função para adicionar Bancos (tabela banks)
    document.getElementById('form-banks').addEventListener('submit', async (event) => {
      event.preventDefault();

      // 1️⃣ Captura dos dados do formulário
      const name = document.getElementById('bank-name').value.trim();
      const balance = parseFloat(document.getElementById('bank-balance').value) || 0; // Converte para número
      const account = document.getElementById('bank-account').value.trim();
      const agency = document.getElementById('bank-agency').value.trim();

      // 2️⃣ Validação: Campos obrigatórios
      if (!name || !account || !agency) {
        Swal.fire({
          icon: 'warning',
          title: 'Atenção!',
          text: 'Por favor, preencha todos os campos obrigatórios.',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      // 3️⃣ Obter usuário logado
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Erro na autenticação:", authError);
        Swal.fire({
          icon: 'error',
          title: 'Erro de Autenticação',
          text: 'Erro ao obter usuário logado. Faça login novamente.',
          confirmButtonColor: '#d33',
        });
        return;
      }

      console.log("Usuário logado:", user);
      const userId = user.id;

      // 4️⃣ Preparar os dados para inserção
      const banksData = {
        name: name,
        balance: balance,
        account_number: account,
        agency: agency,
        user_id: userId,
      };

      console.log("Dados a serem inseridos:", banksData);

      // 5️⃣ Inserir no Supabase
      const { data, error } = await supabase
        .from('banks')
        .insert([banksData]);

      if (error) {
        console.error("Erro ao salvar o banco financeiro:", error);
        Swal.fire({
          icon: 'error',
          title: 'Erro ao Salvar',
          text: 'Não foi possível salvar o banco financeiro. Tente novamente.',
          confirmButtonColor: '#d33',
        });
        return;
      }

      console.log("Banco salvo com sucesso:", data);

      // 6️⃣ Exibir mensagem de sucesso
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Banco salvo com sucesso.',
        confirmButtonColor: '#28a745',
      });

      // 7️⃣ Reset do formulário
      document.getElementById('form-banks').reset();
      document.getElementById('bank-name').focus();
    });
    
    // Atualizar a página ao clicar em "Close"
    document.getElementById('btn-close-bank').addEventListener('click', () => {
      window.location.href = 'index.html'; // Atualiza a página
    });

    // 🔹 Função para buscar transações
    async function fetchTransactions() {
        let { data, error } = await supabase
            .from("transactions")
            .select("date, type, amount, bank_id, category_id, description");

        if (error) {
            console.error("Erro ao buscar transações:", error);
            return;
        }

        const tableBody = document.getElementById("transactionsTable");
        tableBody.innerHTML = ""; // Limpa a tabela antes de inserir novos dados

        data.forEach(transaction => {
            const row = `<tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.type}</td>
                <td>R$ ${transaction.amount.toFixed(2)}</td>
                <td>${transaction.bank_id || "N/A"}</td>
                <td>${transaction.category_id || "N/A"}</td>
                <td>${transaction.description || "Sem descrição"}</td>
                <td>
                    <button onclick="editTransaction(${transaction.id})">✏️ </button>
                    <button onclick="confirmDelete(${transaction.id})">🗑️ </button>
                </td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    }

    // 🔹 Exibir modal de confirmação antes de excluir
    function confirmDelete(id) {
        Swal.fire({
            title: "Tem certeza?",
            text: "Você não poderá reverter essa ação!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Sim, excluir!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                deleteTransaction(id);
            }
        });
    }

    // 🔹 Função para excluir uma transação
    async function deleteTransaction(id) {
        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Erro ao excluir transação:", error);
        } else {
            Swal.fire({
                icon: "success",
                title: "Sucesso!",
                text: "Transação excluída com sucesso.",
                confirmButtonColor: "#28a745",
            });

            fetchTransactions(); // Atualiza a tabela após a exclusão
        }
    }

    // 🔹 Função para editar uma transação (substitua por um modal ou redirecionamento)
    function editTransaction(id) {
        Swal.fire({
            icon: "info",
            title: "Editar transação",
            text: `Função de edição chamada para a transação ID: ${id}`,
            confirmButtonColor: "#007bff",
        });
    }

    // 🔹 Tornar as funções acessíveis globalmente
    window.confirmDelete = confirmDelete;
    window.deleteTransaction = deleteTransaction;
    window.editTransaction = editTransaction;

    // 🔹 Carregar transações ao abrir a página
    fetchTransactions();

});