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

        // Busca o saldo consolidado
        await fetchSaldoAtual(user);

        // Exibe os saldos dos bancos
        await exibirSaldosBancarios(user);
        
        // Exibe categorias receita
        await exibirCategoriasReceitas(user);

        // Exibe categorias despesa
        await exibirCategoriasDespesas(user);

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

    // Função para buscar o saldo consolidado (receitas - despesas)
    async function fetchSaldoAtual(user) {
        try {
            console.log("Buscando transações do usuário...");
            const { data, error } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('user_id', user.id);

            if (error) {
                console.error("Erro ao buscar transações:", error);
                throw error;
            }

            console.log("Transações encontradas:", data);

            // Calcula o total de receitas e despesas
            let totalReceitas = 0;
            let totalDespesas = 0;

            data.forEach(transaction => {
                if (transaction.type === 'receita') {
                    totalReceitas += transaction.amount;
                } else if (transaction.type === 'despesa') {
                    totalDespesas += transaction.amount;
                }
            });

            console.log("Total de receitas:", totalReceitas);
            console.log("Total de despesas:", totalDespesas);

            // Calcula o saldo consolidado
            const saldoAtual = totalReceitas - totalDespesas;

            console.log("Saldo consolidado:", saldoAtual);

            // Exibe o saldo consolidado no card
            document.getElementById('saldoAtual').textContent = saldoAtual.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

        } catch (err) {
            console.error("Erro ao buscar saldo consolidado:", err);
            document.getElementById('saldoAtual').textContent = "Erro ao carregar dados.";
        }
    }

    // Função para buscar os saldos dos bancos
    async function fetchSaldosBancarios(user) {
        try {
            console.log("Buscando saldos dos bancos...");
            const { data: banks, error } = await supabase
                .from('banks')
                .select('id, name, balance')
                .eq('user_id', user.id); // Filtra apenas os bancos do usuário logado

            if (error) {
                console.error("Erro ao buscar saldos dos bancos:", error);
                throw error;
            }

            console.log("Saldos dos bancos encontrados:", banks);
            return banks;

        } catch (err) {
            console.error("Erro ao buscar saldos dos bancos:", err);
            return null;
        }
    }

    // Função para exibir os saldos dos bancos
    async function exibirSaldosBancarios(user) {
        const bancos = await fetchSaldosBancarios(user);

        if (!bancos || bancos.length === 0) {
            console.warn("Nenhum banco encontrado.");
            return;
        }

        const bancosContainer = document.getElementById('bancosContainer');
        if (!bancosContainer) {
            console.error("Elemento 'bancosContainer' não encontrado no HTML.");
            return;
        }

        // Limpa o container antes de adicionar os novos cards
        bancosContainer.innerHTML = '';

        // Cria um card para cada banco
        bancos.forEach(banco => {
            const card = `
                <div class="col-md-6 col-xl-4 mb-4">
                    <div class="card shadow border-left-warning py-2">
                        <div class="card-body">
                            <div class="row g-0 align-items-center">
                                <div class="col me">
                                    <div class="text-uppercase text-success fw-bold text-xs mb-1">
                                        <span>${banco.name}</span>
                                    </div>
                                    <div class="text-dark fw-bold h5 mb-0">
                                        <span>${banco.balance.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        })}</span>
                                    </div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-piggy-bank fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            bancosContainer.insertAdjacentHTML('beforeend', card);
        });
    }

    // Função para mostrar as categorias e valores das receitas
    async function exibirCategoriasReceitas(user, dataSelecionada) {
        try {
            console.log("Buscando categorias de receitas...");

            // Busca todas as transações de receita do usuário
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('amount, date, category_id, categories(name)')
                .eq('user_id', user.id)
                .eq('type', 'receita');

            if (error) {
                console.error("Erro ao buscar transações:", error);
                throw error;
            }

            // Objeto para armazenar os totais por categoria
            const categorias = {};

            // Filtra as transações pela data selecionada
            const dataFiltrada = new Date(dataSelecionada);
            dataFiltrada.setHours(0, 0, 0, 0); // Considera o dia completo

            transactions.forEach(transaction => {
                const categoria = transaction.categories.name;
                const dataTransacao = new Date(transaction.date);

                // Inicializa a categoria se não existir
                if (!categorias[categoria]) {
                    categorias[categoria] = {
                        acumulado: 0,
                        diaSelecionado: 0
                    };
                }

                // Adiciona ao acumulado
                categorias[categoria].acumulado += transaction.amount;

                // Verifica se é do dia selecionado
                if (dataTransacao >= dataFiltrada && dataTransacao < new Date(dataFiltrada.getTime() + 86400000)) {
                    categorias[categoria].diaSelecionado += transaction.amount;
                }
            });

            // Exibe na tabela
            const tabelaBody = document.getElementById('categoriasBody');
            tabelaBody.innerHTML = '';

            for (const [categoria, valores] of Object.entries(categorias)) {
                const row = `
                    <tr>
                        <td>${categoria}</td>
                        <td>${valores.diaSelecionado.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                        <td>${valores.acumulado.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                    </tr>
                `;
                tabelaBody.insertAdjacentHTML('beforeend', row);
            }

        } catch (err) {
            console.error("Erro ao exibir categorias:", err);
            document.getElementById('categoriasBody').innerHTML = `
                <tr>
                    <td colspan="3" class="text-danger">Erro ao carregar categorias</td>
                </tr>
            `;
        }
    }

    // Função para mostrar as categorias e valores das despesas
    async function exibirCategoriasDespesas(user, dataSelecionada) {
        try {
            console.log("Buscando categorias de despesas...");

            // Busca todas as transações de despesa do usuário
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('amount, date, category_id, categories(name)')
                .eq('user_id', user.id)
                .eq('type', 'despesa');

            if (error) {
                console.error("Erro ao buscar transações:", error);
                throw error;
            }

            // Objeto para armazenar os totais por categoria
            const categorias = {};

            // Filtra as transações pela data selecionada
            const dataFiltrada = new Date(dataSelecionada);
            dataFiltrada.setHours(0, 0, 0, 0); // Considera o dia completo

            transactions.forEach(transaction => {
                const categoria = transaction.categories.name;
                const dataTransacao = new Date(transaction.date);

                // Inicializa a categoria se não existir
                if (!categorias[categoria]) {
                    categorias[categoria] = {
                        acumulado: 0,
                        diaSelecionado: 0
                    };
                }

                // Adiciona ao acumulado
                categorias[categoria].acumulado += transaction.amount;

                // Verifica se é do dia selecionado
                if (dataTransacao >= dataFiltrada && dataTransacao < new Date(dataFiltrada.getTime() + 86400000)) {
                    categorias[categoria].diaSelecionado += transaction.amount;
                }
            });

            // Exibe na tabela
            const tabelaBody = document.getElementById('categoriasDespesaBody');
            tabelaBody.innerHTML = '';

            for (const [categoria, valores] of Object.entries(categorias)) {
                const row = `
                    <tr>
                        <td>${categoria}</td>
                        <td>${valores.diaSelecionado.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                        <td>${valores.acumulado.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                    </tr>
                `;
                tabelaBody.insertAdjacentHTML('beforeend', row);
            }

        } catch (err) {
            console.error("Erro ao exibir categorias:", err);
            document.getElementById('categoriasDespesaBody').innerHTML = `
                <tr>
                    <td colspan="3" class="text-danger">Erro ao carregar categorias</td>
                </tr>
            `;
        }
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
    
    // Função para buscar o total de receitas
    async function fetchTotalReceitas(dataSelecionada) {
      let query = supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'receita');

      if (dataSelecionada) {
        // Filtra por data específica
        query = query.eq('date', dataSelecionada);
      } else {
        // Filtra pelo mês corrente
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
        query = query.gte('date', primeiroDiaMes).lte('date', ultimoDiaMes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar receitas:', error);
        return 0;
      }

      // Soma os valores das receitas
      const totalReceitas = data.reduce((total, transacao) => total + (transacao.amount || 0), 0);
      return totalReceitas;
    }

    // Função para buscar o total de despesas
    async function fetchTotalDespesas(dataSelecionada) {
      let query = supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'despesa');

      if (dataSelecionada) {
        // Filtra por data específica
        query = query.eq('date', dataSelecionada);
      } else {
        // Filtra pelo mês corrente
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
        query = query.gte('date', primeiroDiaMes).lte('date', ultimoDiaMes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar despesas:', error);
        return 0;
      }

      // Soma os valores das despesas
      const totalDespesas = data.reduce((total, transacao) => total + (transacao.amount || 0), 0);
      return totalDespesas;
    }

    // Atualiza a interface com os valores totais formatados
    async function atualizarTotais() {
      const dataSelecionada = document.getElementById('dataSelecionada').value;

      // Busca os totais
      const totalReceitas = await fetchTotalReceitas(dataSelecionada);
      const totalDespesas = await fetchTotalDespesas(dataSelecionada);

      // Formata os valores como moeda brasileira (R$)
      const formatoMoeda = {
        style: 'currency',
        currency: 'BRL',
      };

      document.getElementById('total-receitas').textContent = totalReceitas.toLocaleString('pt-BR', formatoMoeda);
      document.getElementById('total-despesas').textContent = totalDespesas.toLocaleString('pt-BR', formatoMoeda);
    }

    // Listener para o campo de seleção de data
    document.getElementById('dataSelecionada').addEventListener('change', async (event) => {
      await atualizarTotais();
    });

    // Inicializa os totais ao carregar a página
    document.addEventListener("DOMContentLoaded", async () => {
      await atualizarTotais();
    });

});