# bebedura

App mobile-first para loja/distribuidora de bebidas, com catalogo para clientes e painel separado para o proprietario.

## Como abrir no VS Code

Abra esta pasta no Visual Studio Code:

`C:\Users\ScooB\Documents\Codex\2026-05-01\app-para-loja-de-bebidas-distribuidora-4`

O app principal esta em `www/index.html`.

## Como testar agora

Voce pode abrir `www/index.html` direto no navegador. Para testar como PWA em um servidor local:

```powershell
npm install
npm run serve
```

Depois acesse `http://localhost:4173`.

## Enviar por link no WhatsApp sem lojas

Use a pasta `publicar-web/bebedura` ou o arquivo `release/bebedura-webapp-whatsapp.zip`.

Suba essa pasta em uma hospedagem HTTPS, como Netlify Drop, Vercel, GitHub Pages ou seu proprio servidor. Depois envie o link pelo WhatsApp.

Guia completo: `docs/APP_SEM_LOJAS_LINK_WHATSAPP.md`.

## Acesso do proprietario

No app, entre na aba `Proprietario` e use o PIN inicial:

```text

```

Antes de vender, troque esse PIN e conecte o painel a uma autenticacao real no servidor. O PIN do prototipo protege a tela, mas seguranca de producao exige backend.

## O que ja esta pronto

- Catalogo de produtos com foto, marca, descricao, valor e disponibilidade.
- Carrinho do cliente com limite pela quantidade disponivel.
- Escolha de entrega ou retirada na loja fisica.
- Meios de pagamento: cartao de credito, debito, Pix e dinheiro na entrega/retirada.
- Cadastro do cliente salvo para a proxima compra quando autorizado.
- Fale conosco com registro de mensagens.
- Painel do proprietario com incluir, editar, excluir produtos e atualizar estoque fisico/virtual.
- Pedidos reservados e baixando automaticamente o estoque do canal escolhido.
- PWA com manifest e service worker.
- Configuracao inicial para empacotar com Capacitor.

## Pacote para vender ou entregar ao cliente

O pacote final local fica em `release/bebedura-pronto-para-cliente.zip`.

Esse arquivo pode ser enviado ao cliente como entrega do software editavel. Consulte `docs/ENTREGA_AO_CLIENTE.md` para o checklist comercial. Para publicar nas lojas oficiais, siga `docs/STORE_PUBLICATION.md`.

## Antes de vender em producao

Consulte `docs/SECURITY_PRIVACY.md` e `docs/STORE_PUBLICATION.md`. Para pagamentos reais, dados de clientes e publicacao nas lojas, voce vai precisar de contas, certificados, gateway de pagamento e backend seguro.
