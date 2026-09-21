# Naylza's Beauty Bookings

# Agenda Salão de Beleza Naylza Reis

## Objetivo

Aplicativo de agendamento para salão de beleza, permitindo que clientes reservem horários e confirmem a reserva com pagamento antecipado de 50% do valor do serviço.

## Telas

### Autenticação

**Rota:** `/`

**Objetivo:** Autenticar clientes e profissionais do salão e permitir o cadastro de novas contas.

**Componentes:**

- **Input Email**

- **Input Senha**

- **Botão Entrar**: Autentica o usuário e redireciona para /dashboard

- **Botão Criar Conta**: Cria uma nova conta de cliente e redireciona para /dashboard

### Início

**Rota:** `/dashboard`

**Objetivo:** Exibir uma visão geral dos agendamentos e pagamentos do usuário.

**Componentes:**

- **Card Próximo Agendamento**

- **Lista de Agendamentos Recentes**

- **Botão Novo Agendamento**: Navega para /booking

- **Botão Ver Todos Agendamentos**: Navega para /appointments

### Novo Agendamento

**Rota:** `/booking`

**Objetivo:** Permitir que o cliente escolha serviço, profissional, data e horário.

**Componentes:**

- **Lista de Serviços**

- **Select Profissional**

- **Calendário de Datas**

- **Grade de Horários Disponíveis**

- **Botão Continuar para Pagamento**: Navega para /checkout com os dados do agendamento

### Pagamento Antecipado

**Rota:** `/checkout`

**Objetivo:** Processar o pagamento antecipado de 50% do valor do serviço agendado.

**Componentes:**

- **Resumo do Agendamento**

- **Card Valor Total**

- **Card Valor Antecipado 50%**

- **Select Método de Pagamento**

- **Botão Pagar 50%**: Processa o pagamento antecipado e confirma o agendamento

### Confirmação

**Rota:** `/confirmation`

**Objetivo:** Confirmar o agendamento realizado e detalhar os valores pagos e restantes.

**Componentes:**

- **Ícone de Sucesso**

- **Detalhes do Agendamento**

- **Texto Valor Pago**

- **Texto Valor Restante**

- **Botão Voltar ao Início**: Navega para /dashboard

### Meus Agendamentos

**Rota:** `/appointments`

**Objetivo:** Listar todos os agendamentos do cliente com o status de pagamento de cada um.

**Componentes:**

- **Filtro de Status**

- **Lista de Agendamentos**

- **Botão Cancelar Agendamento**: Cancela o horário reservado e solicita o reembolso do valor antecipado

- **Botão Pagar Saldo Restante**: Processa o pagamento dos 50% restantes do serviço

### Perfil

**Rota:** `/profile`

**Objetivo:** Gerenciar os dados pessoais e de contato do usuário.

**Componentes:**

- **Input Nome**

- **Input Telefone**

- **Input Email**

- **Botão Salvar**: Salva as alterações dos dados do perfil

- **Botão Sair**: Encerra a sessão e redireciona para /

### Agenda do Salão

**Rota:** `/admin/schedule`

**Objetivo:** Exibir e gerenciar a agenda de horários dos profissionais do salão.

**Componentes:**

- **Calendário da Agenda**

- **Lista de Profissionais**

- **Lista de Agendamentos do Dia**

- **Botão Bloquear Horário**: Bloqueia o horário selecionado na agenda do profissional

### Gerenciar Serviços

**Rota:** `/admin/services`

**Objetivo:** Gerenciar os serviços, preços e durações oferecidos pelo salão.

**Componentes:**

- **Tabela de Serviços**

- **Botão Novo Serviço**: Abre o formulário de criação de serviço

- **Botão Editar Serviço**: Abre o formulário de edição do serviço selecionado

- **Botão Remover Serviço**: Remove o serviço selecionado da lista do salão

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/179389ca-e05c-5a09-bd1e-70fb9ba62a44).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
