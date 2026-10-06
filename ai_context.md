# DOCUMENTO DE REQUISITOS TÉCNICOS: SISTEMA PRÓPRIO DE CFTV VIA RTMP

## 1. Visão Geral do Sistema

O objetivo é construir um sistema próprio de exibição de imagens de câmeras de segurança focado em técnicos. O sistema deve permitir o acesso remoto às imagens sem a necessidade de abertura de portas no roteador do cliente (onde o DVR está instalado).

A arquitetura de desenvolvimento seguirá a estratégia **Mobile-First** (priorizando o design e performance em smartphones), expandindo posteriormente para **Desktop**, com foco em ser futuramente transformado em um **PWA (Progressive Web App)** para instalação nativa em dispositivos móveis.

A arquitetura de rede será baseada no protocolo RTMP de envio (push), dividida em 3 indivíduos:

1. INDIVÍDUO 1: CLIENTE DVR (O Transmissor - Equipamento físico)
2. INDIVÍDUO 2: LADO SERVIDOR (O Hub Central / Servidor de Mídia)
3. INDIVÍDUO 3: LADO CLIENTE SISTEMA (O Visualizador - Dashboard Web/App)

---

## 2. Requisitos de Autenticação e Controle de Acesso

O sistema deve possuir controle de autenticação que separa os usuários em dois níveis de permissão independentes, com regras de negócio específicas para o gerenciamento de acesso:

### Usuário Técnico

- **Acesso:** Possui controle administrativo total da plataforma. Ele também possui a capacidade de visualizar todas as câmeras em seu próprio login.
- **Permissões:** Cadastrar Usuário visualizador, Alterar o próprio usuário ou senha, Cadastrar dispositivos DVR dos clientes, gerenciar vínculos e permissões de acesso, visualizar parâmetros do servidor e criar/vincular novos canais de câmeras gerando as URLs RTMP.

### Usuário Visualizador

- **Acesso:** Restrito unicamente ao consumo e visualização das imagens permitidas. O visualizador não possui o conceito de conta corporativa ou perfil de cliente; ele é estritamente uma credencial de acesso (login e senha) criada pelo técnico.
- **Permissões:** Apenas visualizar os streams de vídeo das câmeras e dispositivos específicos que o Usuário Técnico explicitamente vinculou e concedeu permissão para o seu perfil. Não tem acesso a parâmetros técnicos, tokens ou configurações do sistema.

---

## 3. Requisitos de Interface e Telas (Foco Mobile-First)

A interface deve seguir um fluxo de navegação otimizado para dispositivos móveis, adaptando-se para desktop posteriormente:

### Telas Comuns

- **Tela de Login:** Campos usuário e senha, redirecionando o usuário para a interface correspondente ao seu nível de acesso após a autenticação.

### Telas do Usuário Técnico (Painel Administrativo)

- **Tela de Dashboard Principal:** Exibição de cards informativos com status global do sistema (Total de Clientes, Status de dispositivos DVR e Câmeras).
- **Tela de Cadastro/Listagem de Usuários:** Interface para gerenciamento, criação e edição de registros de usuários (incluindo a vinculação de quais dispositivos e canais cada Usuário Visualizador terá permissão para assistir).
- **Tela de Cadastro de Dispositivos DVR:** Formulário centralizado focado no cadastro do cliente e sua estrutura técnica, composto por:
    - Campo de texto: Nome do Cliente (Obrigatório).
    - Campo de texto: Descrição (Opcional, posicionado abaixo do nome).
    - Seção de Hardware (Mais abaixo): Botão "Adicionar Dispositivo" e botão "Adicionar Câmeras". O preenchimento desta seção e o vínculo de um dispositivo ou câmera ao cliente cadastrado é totalmente opcional.
- **Tela de Vínculo de Câmeras/Canais:** Lista de canais disponíveis do DVR selecionado onde o técnico associa um nome identificador e o sistema disponibiliza um botão para copiar a URL RTMP Individual gerada para o Indivíduo 1.

### Telas do Usuário Visualizador (Painel do Cliente)

- **Tela de Grade de Câmeras (Home):** Exibição em grade de duas colunas (layout responsivo móvel) renderizando os players de vídeo apenas das câmeras ativas que foram vinculadas e permitidas pelo técnico para este usuário em tempo real.
- **Tela do Player Detalhado:** Interface focada no vídeo expandido com suporte a rotação de tela (modo paisagem) para visualização em tela cheia da câmera selecionada.

---

## 4. Requisitos dos 3 Indivíduos

### INDIVÍDUO 1: CLIENTE DVR (O Transmissor)

- **Comportamento:** O DVR físico utilizará a função nativa de RTMP (Modo "Personalizar") para iniciar uma conexão de acesso de saída em direção ao Lado Servidor.
- **Entrada de dados:** O gravador precisa apenas receber uma "URL Personalizada" gerada individualmente pelo sistema para cada câmera/canal.
- **Formato esperado da URL de envio:** `rtmp://<ip_ou_dominio_servidor>:<porta_rtmp>/live/<token_unico_da_camera>`
- **Restrição:** O codec de vídeo do DVR será configurado manualmente pelo técnico como H.264 e o codec de áudio como AAC para garantir compatibilidade nativa com navegadores web sem transcodificação.

### INDIVÍDUO 2: LADO SERVIDOR (O Hub Central)

- **Comportamento:** Uma instância hospedada em nuvem VPS executando um Servidor de Mídia MediaMTX.
- **Parâmetros do Servidor:**
    - Deve escutar conexões de entrada RTMP. A porta padrão é `1935`, porém deve ser parametrizável para que o usuário técnico possa alterá-la.
    - Deve expor uma aplicação/pasta virtual chamada `/live/`.
    - Deve converter dinamicamente e em tempo real o fluxo RTMP de entrada para o protocolo **LL-HLS (Low-Latency HLS)** para garantir baixa latência.
    - Deve expor as portas de saída web `8554` para consumo do Indivíduo 3.
    - Deve possuir um endpoint de webhook para validar se o `<token_unico_da_camera>` enviado pelo DVR é válido antes de aceitar o streaming.

### INDIVÍDUO 3: LADO CLIENTE SISTEMA (O Visualizador)

- **Comportamento:** Um painel/dashboard dinâmico construído com foco inicial em **Mobile-First**, adaptável para **Desktop** e estruturado arquitetonicamente para suportar capacidades de **PWA** (Manifest, Service Workers e caching de interface).
- **Funcionamento:** O usuário final ou técnico abre a aplicação, a interface consome os dados do Backend e renderiza o player de vídeo apontando para o Indivíduo 2 (Servidor de Mídia) através do token correspondente.
- **Formato esperado da URL de visualização (LL-HLS):** `http://<ip_ou_dominio_servidor>:<porta_web>/live/<token_unico_da_camera>/index.m3u8`
- **Tecnologia de exibição:** Utilizar um player open-source em JavaScript com suporte nativo a LL-HLS (como hls.js ou Video.js com suporte a streams fragmentados) integrado à interface nativa HTML5 via tag `<video>`.

---