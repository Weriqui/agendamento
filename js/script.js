// Seleciona todos os elementos de etapa do formulário
const formSteps = document.querySelectorAll(".form-step");
// Seleciona os botões de navegação
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
// Seleciona os cards de opção
const optionCards = document.querySelectorAll('.option-card');
// Variável para controlar a etapa atual
let currentStep = 0;

// Atualiza os botões de navegação e as etapas do formulário
function updateFormSteps() {
    formSteps.forEach((step, index) => {
        step.classList.toggle("active", index === currentStep);
    });

    // Atualiza o estado dos botões de navegação
    prevBtn.disabled = currentStep === 0;
    nextBtn.textContent = currentStep === formSteps.length - 1 ? "Finalizar" : "Próximo";
}

// Avança para a próxima etapa do formulário
function nextStep() {
    const nomeNegocioInput = document.querySelector('input[name="nome-negocio"]');
    const horario = document.querySelector("#selected-slot")
    if (currentStep === 1 && !nomeNegocioInput.dataset.dealId) {
        nomeNegocioInput.value = ''
    }
    if (currentStep === 0 && !possuiAtributo(horario,'data-horario')) {
        return
    }

    const currentInputs = formSteps[currentStep].querySelectorAll("input[required], select[required]");
    let valid = true;

    currentInputs.forEach(input => {
        if (!input.checkValidity()) {
            input.classList.add("error");
            const errorMessage = input.closest(".form-step").querySelector(".error-message");
            if (errorMessage) {
                errorMessage.style.display = "block";
            }
            valid = false;
        } else {
            input.classList.remove("error");
            const errorMessage = input.closest(".form-step").querySelector(".error-message");
            if (errorMessage) {
                errorMessage.style.display = "none";
            }
        }
    });

    if (valid && currentStep < formSteps.length - 1) {
        if (currentStep === formSteps.length - 2) {
            updateReviewContent(); // Atualiza o conteúdo de revisão
        }
        formSteps[currentStep].classList.add('exiting-left');
        currentStep++;
        formSteps[currentStep].classList.add('entering-right', 'active');
        
        setTimeout(() => {
            formSteps[currentStep - 1].classList.remove('exiting-left', 'active');
            formSteps[currentStep].classList.remove('entering-right');
        }, 500);
        
        updateFormSteps();
    }
}

// Volta para a etapa anterior do formulário
function prevStep() {
    if (currentStep > 0) {
        formSteps[currentStep].classList.remove('active');
        formSteps[currentStep].classList.add('exiting-right');
        currentStep--;
        formSteps[currentStep].classList.add('entering-left', 'active');

        setTimeout(() => {
            formSteps[currentStep + 1].classList.remove('exiting-right', 'active');
            formSteps[currentStep].classList.remove('entering-left');
        }, 500);
        
        updateFormSteps();
    }
}

// Evento dos botões de navegação
nextBtn.addEventListener("click", nextStep);
prevBtn.addEventListener("click", prevStep);

// Adiciona evento aos cards de opção para marcar e avançar automaticamente
optionCards.forEach(card => {
    card.addEventListener('click', () => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
            radio.checked = true;
            document.querySelectorAll(`[name="${radio.name}"]`).forEach(input => {
                input.closest('.option-card').classList.remove('selected');
            });
            card.classList.add('selected');

            setTimeout(() => {
                nextStep();
            }, 300);
        }
    });
});

// Inicializa a visualização inicial
updateFormSteps();


// Adiciona funcionalidade de busca dinâmica para negócios no Pipedrive
const nomeNegocioInput = document.querySelector('input[name="nome-negocio"]');
const suggestionsContainer = document.querySelector('.suggestions-container');

nomeNegocioInput.addEventListener('input', function () {
    const term = nomeNegocioInput.value;

    if (term.length < 3) {
        suggestionsContainer.innerHTML = ""; // Limpa sugestões se a entrada for muito curta
        return;
    }

    // Headers da requisição
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");

    // Opções da requisição
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    // Faz a requisição de busca à API do Pipedrive
    fetch(`https://api.pipedrive.com/v1/deals/search?term=${term}&api_token=6c7d502747be67acc199b483803a28a0c9b95c09`, requestOptions)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                displaySuggestions(result.data.items);
            } else {
                suggestionsContainer.innerHTML = "";
            }
        })
        .catch(error => console.error('Erro:', error));
});

function displaySuggestions(items) {
    suggestionsContainer.innerHTML = "";
    items.forEach(item => {
        const suggestion = document.createElement('div');
        suggestion.classList.add('suggestion-item');
        if (item.item.status === 'lost') {
            suggestion.classList.add('lost'); // Destaca os negócios perdidos
        }
        suggestion.innerHTML = `
            <div class="title">${item.item.title}</div>
            <div class="details">
                Etapa: ${item.item.stage.name} | Status: ${item.item.status} | Pessoa: ${item.item.person ? item.item.person.name : 'N/A'}
            </div>
        `;
        suggestion.dataset.dealId = item.item.id; // Salva o ID do negócio
        suggestion.addEventListener('click', () => {
            nomeNegocioInput.value = item.item.title;
            suggestionsContainer.innerHTML = ""; // Limpa as sugestões após selecionar
            nomeNegocioInput.dataset.dealId = item.item.id; // Salva o ID do negócio selecionado
        });
        suggestionsContainer.appendChild(suggestion);
    });
}


document.addEventListener("DOMContentLoaded", async () => {
    const timeSlotsContainer = document.getElementById("time-slots");
    const selectedSlotContainer = document.getElementById("selected-slot");
    const selectedTimeElement = document.getElementById("selected-time");
    const cancelSelectionButton = document.getElementById("cancel-selection");
    const loadingElement = document.getElementById("loading");

    let horariosDisponiveis = {};

    try {
        // Fazer a solicitação assíncrona para obter os horários disponíveis
        const response = await fetch("https://automation-pipe-af55514da494.herokuapp.com/horarios-disponiveis");
        horariosDisponiveis = await response.json();

        // Esconder o elemento de carregamento
        loadingElement.style.display = "none";

        // Inicializar o calendário
        flatpickr("#calendar", {
            inline: true,
            dateFormat: "Y-m-d",
            onChange: function (selectedDates, dateStr) {
                atualizarHorarios(dateStr);
            }
        });

    } catch (error) {
        console.error("Erro ao obter horários disponíveis:", error);
        loadingElement.innerText = "Erro ao carregar os horários disponíveis. Por favor, tente novamente mais tarde.";
    }

    // Função para atualizar os horários para a data selecionada
    function atualizarHorarios(diaSelecionado) {
        // Limpar os horários atuais
        timeSlotsContainer.innerHTML = "";

        // Exibir mensagem de carregamento
        const loadingMessage = document.createElement("div");
        loadingMessage.classList.add("loading");
        loadingMessage.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Procurando horários disponíveis...";
        timeSlotsContainer.appendChild(loadingMessage);

        setTimeout(() => {
            // Limpar mensagem de carregamento após simular uma busca
            timeSlotsContainer.innerHTML = "";

            // Filtrar os horários para o dia selecionado
            if (horariosDisponiveis[diaSelecionado]) {
                // Renderizar os horários disponíveis
                Object.keys(horariosDisponiveis[diaSelecionado]).forEach(hora => {
                    const slotDiv = document.createElement("div");
                    slotDiv.classList.add("time-slot", "available");

                    // Exibir o horário
                    slotDiv.textContent = hora;

                    // Adicionar evento de clique para selecionar o horário
                    slotDiv.addEventListener("click", () => selecionarHorario(diaSelecionado, hora));

                    // Adicionar o horário à interface
                    timeSlotsContainer.appendChild(slotDiv);
                });
            } else {
                // Caso não tenha horários disponíveis
                const noSlotsDiv = document.createElement("div");
                noSlotsDiv.textContent = "Nenhum horário disponível para esta data.";
                timeSlotsContainer.appendChild(noSlotsDiv);
            }
        }, 500);
    }

    // Função para selecionar um horário
    function selecionarHorario(dia, hora) {
        const data = new Date(dia);
        const diaFormatado = data.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Atualizar o elemento de horário selecionado
        selectedTimeElement.textContent = `${hora} - ${diaFormatado}`;
        // Guardar o horário selecionado no atributo data-horario do elemento #selected-slot
        selectedSlotContainer.setAttribute('data-horario', `${dia} ${hora}`);

        // Mostrar a seção de horário selecionado com animação
        selectedSlotContainer.style.display = "flex";
        selectedSlotContainer.classList.add("visible");
    }

    // Função para cancelar a seleção
    cancelSelectionButton.addEventListener("click", () => {
        selectedSlotContainer.classList.remove("visible");
        selectedSlotContainer.removeAttribute('data-horario');
        setTimeout(() => {
            selectedSlotContainer.style.display = "none";
        }, 400);
    });
});

function possuiAtributo(elemento, atributo) {
  return elemento.hasAttribute(atributo);
}

function updateReviewContent() {
    const reviewContent = document.getElementById('review-content');
    reviewContent.innerHTML = ''; // Limpa o conteúdo anterior

    // Lista de inputs e seus valores
    const inputs = document.querySelectorAll('#multi-step-form input, #multi-step-form select');
    inputs.forEach(input => {
        let label = '';
        let value = '';

        // Captura o valor do input
        if (input.type === 'radio' && input.checked) {
            label = input.closest('.form-step').querySelector('h3').innerText;
            value = input.parentElement.innerText.trim();
        } else if (input.type !== 'radio' && input.value) {
            label = input.placeholder || input.name;
            value = input.value;
        }

        // Adiciona o campo e valor ao resumo se houver um valor preenchido
        if (label && value) {
            const item = document.createElement('div');
            item.classList.add('review-item');
            item.innerHTML = `<strong>${label}:</strong> ${value}`;
            reviewContent.appendChild(item);
        }
    });

    // Adiciona o horário selecionado, se houver
    const selectedSlot = document.querySelector("#selected-slot").getAttribute('data-horario');
    if (selectedSlot) {
        const item = document.createElement('div');
        item.classList.add('review-item');
        item.innerHTML = `<strong>Data e Horário Selecionado:</strong> ${selectedSlot}`;
        reviewContent.appendChild(item);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const objecaoOutrosInput = document.getElementById("objecao-outros");

    document.querySelectorAll('input[name="objecao"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'outros') {
                objecaoOutrosInput.style.display = 'block';
                objecaoOutrosInput.required = true;  // Define que o campo é obrigatório
            } else {
                objecaoOutrosInput.style.display = 'none';
                objecaoOutrosInput.required = false; // Remove o atributo obrigatório
                objecaoOutrosInput.value = ""; // Limpa o campo de texto caso "Outros" seja desmarcado
            }
        });
    });

    const phoneInput = document.querySelector('.phone');
    // Formatação básica ao digitar, adicionando apenas o código de país +55
    function basicFormatPhone() {
        let value = phoneInput.value.replace(/\D/g, ""); // Remove tudo que não for número

        // Adiciona o código de país +55 se não estiver presente
        if (!value.startsWith("55")) {
            value = "55" + value;
        }

        // Limita o número ao tamanho máximo (13 dígitos após o +)
        value = value.slice(0, 13);

        // Define o valor do input com o formato correto
        phoneInput.value = "+" + value;
    }

    // Formatação final ao perder o foco, adicionando o nono dígito se necessário
    function finalFormatPhone() {
        let value = phoneInput.value.replace(/\D/g, ""); // Remove tudo que não for número

        // Se o número total (sem o código de país) tiver 10 dígitos, adiciona o nono dígito
        if (value.length >= 4 && value.length <= 12) {
            const dddAndNumber = value.slice(2); // Remove o código de país
            if (dddAndNumber.length === 10 && !dddAndNumber.startsWith("9")) {
                value = "55" + dddAndNumber.slice(0, 2) + "9" + dddAndNumber.slice(2);
            }
        }

        // Limita o número ao formato +559XXXXXXXXX
        value = value.slice(0, 13);

        // Define o valor do input com o formato correto
        phoneInput.value = "+" + value;
    }

    // Evento de formatação básica ao digitar
    phoneInput.addEventListener("input", basicFormatPhone);
    // Evento de formatação final ao perder o foco
    phoneInput.addEventListener("blur", finalFormatPhone);
    // Evento para garantir formatação correta ao colar
    phoneInput.addEventListener("paste", (event) => {
        setTimeout(basicFormatPhone, 0); // Pequeno atraso para pegar o valor colado
    });
});


