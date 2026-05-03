const app = document.querySelector("#app");

const OWNER_PIN = "198023"; // pim de acesso ao proprietário
const LOW_STOCK_LIMIT = 20;
const PIX_KEY = "61991767473";// chave pix pagamento texte
const STORE_PHONE = "5561991767473";//whatsapp pessoal para texte

const STORAGE = {
  products: "da.products",
  cart: "da.cart",
  orders: "da.orders",
  tickets: "da.tickets",
  customer: "da.customer"
};

const PAYMENT_LABELS = {
  credit: "Cartão de crédito",
  debit: "Cartão de débito",
  pix: "Pix",
  cash: "Dinheiro"
};

const FULFILLMENT_LABELS = {
  delivery: "Entrega",
  pickup: "Retirada"
};

const ORDER_STATUSES = [
  "Reservado",
  "Separando",
  "Pronto para retirada",
  "Saiu para entrega",
  "Entregue",
  "Cancelado"
];

const DEFAULT_PRODUCTS = [
  {
    id: "prod-cerveja-001",
    name: "Cerveja Pilsen 350ml - caixa c/12",
    brand: "Litoral",
    category: "Cervejas",
    description: "Caixa gelada para giro rápido, ideal para festas, churrascos e reposição de balcão.",
    price: 54.9,
    physicalStock: 42,
    onlineStock: 24,
    image: "assets/products/cerveja.svg",
    active: true
  },
  {
    id: "prod-whisky-001",
    name: "Whisky Reserva 750ml",
    brand: "Oak Prime",
    category: "Destilados",
    description: "Destilado premium com boa margem para presentes, combos e pedidos noturnos.",
    price: 139.9,
    physicalStock: 14,
    onlineStock: 8,
    image: "assets/products/whisky.svg",
    active: true
  },
  {
    id: "prod-refri-001",
    name: "Refrigerante 2L",
    brand: "Viva Cola",
    category: "Sem álcool",
    description: "Refrigerante de alto consumo para retirada rápida ou entrega junto com combos.",
    price: 10.9,
    physicalStock: 58,
    onlineStock: 36,
    image: "assets/products/refrigerante.svg",
    active: true
  },
  {
    id: "prod-vinho-001",
    name: "Vinho Tinto Seleção 750ml",
    brand: "Vale Alto",
    category: "Vinhos",
    description: "Vinho versátil para jantares, presentes e kits especiais do catálogo virtual.",
    price: 64.9,
    physicalStock: 11,
    onlineStock: 7,
    image: "assets/products/vinho.svg",
    active: true
  },
  {
    id: "prod-gelo-001",
    name: "Gelo filtrado 5kg",
    brand: "Polar Sul",
    category: "Conveniência",
    description: "Item essencial para aumentar ticket médio em entregas e retiradas.",
    price: 14.9,
    physicalStock: 26,
    onlineStock: 16,
    image: "assets/products/gelo.svg",
    active: true
  },
  {
    id: "prod-combo-001",
    name: "Combo Churrasco Completo",
    brand: "Casa",
    category: "Combos",
    description: "Cervejas, refrigerantes e gelo em um pacote pronto para compra rápida.",
    price: 129.9,
    physicalStock: 6,
    onlineStock: 4,
    image: "assets/products/combo.svg",
    active: true
  }
];

const DEFAULT_CUSTOMER = {
  name: "",
  phone: "",
  address: "",
  reference: ""
};

const state = {
  products: readStorage(STORAGE.products, DEFAULT_PRODUCTS).map(normalizeProduct),
  cart: readStorage(STORAGE.cart, []),
  orders: readStorage(STORAGE.orders, []),
  tickets: readStorage(STORAGE.tickets, []),
  customer: readStorage(STORAGE.customer, DEFAULT_CUSTOMER),
  ownerUnlocked: sessionStorage.getItem("da.ownerUnlocked") === "true",
  ui: {
    view: "customer",
    category: "Todos",
    fulfillment: "delivery",
    payment: "pix",
    query: "",
    editingId: "",
    uploadedImage: "",
    toast: ""
  }
};

let toastTimer = 0;

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : cloneValue(fallback);
  } catch {
    return cloneValue(fallback);
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeProduct(product) {
  return {
    ...product,
    price: Number(product.price) || 0,
    physicalStock: Math.max(0, Number(product.physicalStock) || 0),
    onlineStock: Math.max(0, Number(product.onlineStock) || 0),
    active: product.active !== false
  };
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCategories() {
  const categories = new Set(state.products.map((product) => product.category).filter(Boolean));
  return ["Todos", ...Array.from(categories).sort((a, b) => a.localeCompare(b, "pt-BR"))];
}

function visibleProducts() {
  const query = state.ui.query.trim().toLowerCase();
  return state.products
    .filter((product) => product.active)
    .filter((product) => state.ui.category === "Todos" || product.category === state.ui.category)
    .filter((product) => {
      if (!query) return true;
      return [product.name, product.brand, product.category, product.description]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
}

function stockForChannel(product) {
  return state.ui.fulfillment === "pickup" ? product.physicalStock : product.onlineStock;
}

function cartCount() {
  return state.cart.reduce((total, item) => total + item.qty, 0);
}

function getProduct(productId) {
  return state.products.find((product) => product.id === productId);
}

function cartItems() {
  return state.cart
    .map((item) => {
      const product = getProduct(item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter(Boolean);
}

function calculateTotals() {
  const subtotal = cartItems().reduce((total, item) => total + item.product.price * item.qty, 0);
  const deliveryFee = subtotal > 0 && state.ui.fulfillment === "delivery" ? 8.9 : 0;
  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee
  };
}

function saveProducts() {
  writeStorage(STORAGE.products, state.products);
}

function saveCart() {
  writeStorage(STORAGE.cart, state.cart);
}

function saveOrders() {
  writeStorage(STORAGE.orders, state.orders);
}

function saveTickets() {
  writeStorage(STORAGE.tickets, state.tickets);
}

function saveCustomer() {
  writeStorage(STORAGE.customer, state.customer);
}

function showToast(message) {
  state.ui.toast = message;
  render();
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    state.ui.toast = "";
    render();
  }, 2600);
}

function render() {
  app.innerHTML = `
    ${renderTopbar()}
    <main class="page">
      ${state.ui.view === "owner" ? renderOwnerView() : renderCustomerView()}
    </main>
    <div class="toast ${state.ui.toast ? "is-visible" : ""}" role="status">${escapeHtml(state.ui.toast)}</div>
  `;
}

function renderTopbar() {
  const customerActive = state.ui.view === "customer" ? "is-active" : "";
  const ownerActive = state.ui.view === "owner" ? "is-active" : "";

  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand" aria-label="bebedura">
          <div class="brand-mark">be</div>
          <div class="brand-copy">
            <div class="brand-title">bebedura</div>
            <div class="brand-subtitle">Catálogo, estoque e pedidos em tempo real</div>
          </div>
        </div>
        <div class="topbar-actions">
          <nav class="mode-tabs" aria-label="Modo do aplicativo">
            <button class="${customerActive}" type="button" data-action="switch-view" data-view="customer">Cliente</button>
            <button class="${ownerActive}" type="button" data-action="switch-view" data-view="owner">Proprietário</button>
          </nav>
          <button class="icon-button" type="button" data-action="go-cart" aria-label="Abrir carrinho">
            Carrinho <span class="cart-count">${cartCount()}</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderCustomerView() {
  const products = visibleProducts();

  return `
    <section class="toolbar-band">
      <div class="catalog-header">
        <div>
          <p class="section-kicker">Catálogo ao vivo</p>
          <h1 class="section-title">Bebidas disponíveis para comprar, reservar ou retirar.</h1>
          <p class="section-copy">O estoque exibido acompanha o canal escolhido e cada pedido reservado baixa a quantidade automaticamente.</p>
        </div>
        <div class="segmented" aria-label="Escolha de atendimento">
          ${renderFulfillmentButton("delivery", "Entrega")}
          ${renderFulfillmentButton("pickup", "Retirada")}
        </div>
      </div>
      <div class="catalog-tools">
        <label class="search-field">
          <span class="sr-only">Buscar produto</span>
          <input id="catalogSearch" type="search" value="${escapeAttr(state.ui.query)}" placeholder="Buscar por produto, marca ou categoria" autocomplete="off" />
        </label>
        <div class="category-row" aria-label="Categorias">
          ${getCategories().map(renderCategoryButton).join("")}
        </div>
      </div>
    </section>

    <section class="client-layout">
      <div class="catalog-grid" aria-live="polite">
        ${products.length ? products.map(renderProductCard).join("") : `<div class="empty-state">Nenhum produto encontrado.</div>`}
      </div>
      ${renderCartPanel()}
    </section>

    ${renderCustomerHistory()}
    ${renderSupportBand()}
  `;
}

function renderFulfillmentButton(value, label) {
  const active = state.ui.fulfillment === value ? "is-active" : "";
  return `<button class="pill-button ${active}" type="button" data-action="set-fulfillment" data-fulfillment="${value}">${label}</button>`;
}

function renderCategoryButton(category) {
  const active = state.ui.category === category ? "is-active" : "";
  return `<button class="pill-button ${active}" type="button" data-action="set-category" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>`;
}

function renderProductCard(product) {
  const available = stockForChannel(product);
  const inCart = state.cart.find((item) => item.productId === product.id)?.qty || 0;
  const statusClass = available <= 0 ? "is-danger" : available <= LOW_STOCK_LIMIT ? "is-muted" : "";
  const statusText = available <= 0 ? "Indisponível" : `${available} disponíveis`;

  return `
    <article class="product-card">
      <img class="product-image" src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" />
      <div class="product-body">
        <div class="product-topline">
          <div class="product-title">
            <span class="brand-label">${escapeHtml(product.brand)}</span>
            <h3>${escapeHtml(product.name)}</h3>
          </div>
          <span class="price">${money(product.price)}</span>
        </div>
        <p class="description">${escapeHtml(product.description)}</p>
        <div class="stock-meta">
          <div><strong>${product.physicalStock}</strong><span>Loja física</span></div>
          <div><strong>${product.onlineStock}</strong><span>Virtual/entrega</span></div>
        </div>
        <div class="product-actions">
          <span class="status-chip ${statusClass}">${statusText}</span>
          ${
            inCart
              ? `<span class="tag-chip">${inCart} no carrinho</span>`
              : ""
          }
          <button class="primary-button" type="button" data-action="add-cart" data-product-id="${escapeAttr(product.id)}" ${available <= 0 ? "disabled" : ""}>Adicionar</button>
        </div>
      </div>
    </article>
  `;
}

function renderCartPanel() {
  const items = cartItems();
  const totals = calculateTotals();

  return `
    <aside class="cart-panel" id="cartPanel" aria-label="Carrinho">
      <div class="cart-header">
        <h2>Pedido</h2>
        <span class="status-chip">${FULFILLMENT_LABELS[state.ui.fulfillment]}</span>
      </div>
      <div class="cart-content">
        ${
          items.length
            ? `
              <div class="cart-list">
                ${items.map(renderCartItem).join("")}
              </div>
              <div class="cart-total">
                <div class="total-line"><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div>
                <div class="total-line"><span>Taxa de entrega</span><strong>${money(totals.deliveryFee)}</strong></div>
                <div class="total-line final"><span>Total</span><strong>${money(totals.total)}</strong></div>
              </div>
              ${renderCheckoutForm()}
            `
            : `<div class="cart-empty">Seu carrinho está vazio.</div>`
        }
      </div>
    </aside>
  `;
}

function renderCartItem(item) {
  return `
    <div class="cart-row">
      <img src="${escapeAttr(item.product.image)}" alt="${escapeAttr(item.product.name)}" />
      <div>
        <h3>${escapeHtml(item.product.name)}</h3>
        <p>${money(item.product.price)} cada</p>
        <div class="cart-row-actions">
          <button class="qty-button" type="button" data-action="dec-cart" data-product-id="${escapeAttr(item.productId)}" aria-label="Diminuir quantidade">-</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-button" type="button" data-action="inc-cart" data-product-id="${escapeAttr(item.productId)}" aria-label="Aumentar quantidade">+</button>
          <button class="ghost-button" type="button" data-action="remove-cart" data-product-id="${escapeAttr(item.productId)}">Remover</button>
        </div>
      </div>
    </div>
  `;
}

function renderCheckoutForm() {
  const customer = state.customer;
  const addressRequired = state.ui.fulfillment === "delivery" ? "required" : "";

  return `
    <form class="checkout-form" id="checkoutForm">
      <div class="payment-grid" aria-label="Meio de pagamento">
        ${renderPaymentButton("credit")}
        ${renderPaymentButton("debit")}
        ${renderPaymentButton("pix")}
        ${renderPaymentButton("cash")}
      </div>
      ${renderPaymentNote()}
      <label class="form-field">
        <span>Nome</span>
        <input name="name" value="${escapeAttr(customer.name)}" autocomplete="name" required />
      </label>
      <label class="form-field">
        <span>Contato</span>
        <input name="phone" value="${escapeAttr(customer.phone)}" inputmode="tel" autocomplete="tel" required />
      </label>
      <label class="form-field">
        <span>Endereço</span>
        <input name="address" value="${escapeAttr(customer.address)}" autocomplete="street-address" ${addressRequired} />
      </label>
      <label class="form-field">
        <span>Complemento ou referência</span>
        <input name="reference" value="${escapeAttr(customer.reference)}" />
      </label>
      <label class="check-field">
        <input name="saveCustomer" type="checkbox" checked />
        <span>Salvar meus dados para a próxima compra</span>
      </label>
      <label class="check-field">
        <input name="ageCheck" type="checkbox" required />
        <span>Confirmo que sou maior de 18 anos</span>
      </label>
      <button class="primary-button" type="submit">Reservar pedido</button>
    </form>
  `;
}

function renderPaymentButton(value) {
  const active = state.ui.payment === value ? "is-active" : "";
  return `<button class="pill-button ${active}" type="button" data-action="set-payment" data-payment="${value}">${PAYMENT_LABELS[value]}</button>`;
}

function renderPaymentNote() {
  if (state.ui.payment === "pix") {
    return `
      <div class="payment-note">
        Chave Pix: <strong>${PIX_KEY}</strong>
        <button class="ghost-button" type="button" data-action="copy-pix">Copiar</button>
      </div>
    `;
  }

  if (state.ui.payment === "cash") {
    return `<div class="payment-note">Pagamento combinado para a entrega ou retirada.</div>`;
  }

  return `<div class="payment-note">Cartões devem ser cobrados por gateway seguro. O app não salva dados de cartão.</div>`;
}

function renderCustomerHistory() {
  if (!state.orders.length) return "";
  const recentOrders = state.orders.slice(0, 3);

  return `
    <section class="customer-history mini-panel">
      <div class="panel-header">
        <h2>Últimos pedidos</h2>
        <span class="status-chip">${recentOrders.length}</span>
      </div>
      <div class="orders-list">
        ${recentOrders
          .map(
            (order) => `
              <article class="order-item">
                <h3>${escapeHtml(order.id)} · ${money(order.total)}</h3>
                <p>${FULFILLMENT_LABELS[order.fulfillment]} · ${PAYMENT_LABELS[order.payment]} · ${escapeHtml(order.status)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSupportBand() {
  const recentTickets = state.tickets.slice(0, 3);

  return `
    <section class="support-band" id="support">
      <div>
        <p class="section-kicker">Fale conosco</p>
        <h2 class="section-title">Atendimento para dúvidas, pedidos e dificuldades.</h2>
        <p class="section-copy">Mensagens ficam registradas para o proprietário acompanhar e responder com mais agilidade.</p>
        <div class="support-list" aria-live="polite">
          ${
            recentTickets.length
              ? recentTickets.map(renderTicket).join("")
              : `<div class="empty-state">Nenhuma mensagem registrada.</div>`
          }
        </div>
      </div>
      <form class="contact-form mini-panel" id="contactForm">
        <label class="form-field">
          <span>Nome</span>
          <input name="name" value="${escapeAttr(state.customer.name)}" required />
        </label>
        <label class="form-field">
          <span>Contato</span>
          <input name="phone" value="${escapeAttr(state.customer.phone)}" inputmode="tel" required />
        </label>
        <label class="form-field">
          <span>Assunto</span>
          <select name="topic">
            <option>Pedido</option>
            <option>Pagamento</option>
            <option>Entrega</option>
            <option>Retirada</option>
            <option>Catálogo</option>
          </select>
        </label>
        <label class="form-field">
          <span>Mensagem</span>
          <textarea name="message" required></textarea>
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">Enviar mensagem</button>
          <a class="secondary-button" href="https://wa.me/${STORE_PHONE}" target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </form>
    </section>
  `;
}

function renderTicket(ticket) {
  return `
    <article class="ticket-item">
      <h3>${escapeHtml(ticket.topic)} · ${escapeHtml(ticket.name)}</h3>
      <p>${escapeHtml(ticket.message)}</p>
      <p>${formatDate(ticket.createdAt)}</p>
    </article>
  `;
}

function renderOwnerView() {
  if (!state.ownerUnlocked) return renderOwnerLock();

  return `
    <section class="owner-band">
      <div class="catalog-header">
        <div>
          <p class="section-kicker">Painel do proprietário</p>
          <h1 class="section-title">Controle de catálogo, estoque físico e estoque virtual.</h1>
        </div>
        <button class="secondary-button" type="button" data-action="owner-logout">Sair</button>
      </div>
      ${renderOwnerSummary()}
    </section>

    <section class="owner-grid">
      <div class="owner-side">
        ${renderProductForm()}
        ${renderRestockAlerts()}
      </div>
      <div class="owner-card">
        <div class="panel-header">
          <h2>Produtos cadastrados</h2>
          <span class="status-chip">${state.products.length}</span>
        </div>
        <div class="stock-list">
          ${state.products.map(renderStockRow).join("")}
        </div>
      </div>
    </section>

    <section class="owner-card owner-orders-panel">
      <div class="panel-header">
        <h2>Pedidos e reservas</h2>
        <span class="status-chip">${state.orders.length}</span>
      </div>
      ${renderOwnerOrders()}
    </section>
  `;
}

function renderOwnerLock() {
  return `
    <section class="lock-band">
      <h1>Acesso do proprietário</h1>
      <p class="section-copy">Entre para gerenciar produtos, fotos, preços e estoque.</p>
      <form class="owner-login" id="ownerLogin">
        <label class="form-field">
          <span>PIN</span>
          <input name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" required />
        </label>
        <button class="primary-button" type="submit">Entrar</button>
      </form>
    </section>
  `;
}

function renderOwnerSummary() {
  const physical = state.products.reduce((total, product) => total + product.physicalStock, 0);
  const online = state.products.reduce((total, product) => total + product.onlineStock, 0);
  const critical = state.products.filter(isLowStock).length;
  const openOrders = state.orders.filter((order) => !["Entregue", "Cancelado"].includes(order.status)).length;

  return `
    <div class="summary-grid">
      <div class="summary-tile"><strong>${physical}</strong><span>Unidades na loja</span></div>
      <div class="summary-tile"><strong>${online}</strong><span>Unidades virtuais</span></div>
      <div class="summary-tile"><strong>${critical}</strong><span>Alertas de reposição</span></div>
      <div class="summary-tile"><strong>${openOrders}</strong><span>Pedidos em aberto</span></div>
    </div>
  `;
}

function renderProductForm() {
  const editing = state.products.find((product) => product.id === state.ui.editingId);
  const product = editing || {
    name: "",
    brand: "",
    category: "",
    description: "",
    price: "",
    physicalStock: "",
    onlineStock: "",
    image: "assets/products/combo.svg",
    active: true
  };
  const image = state.ui.uploadedImage || product.image || "assets/products/combo.svg";

  return `
    <div class="owner-card" id="productFormPanel">
      <div class="panel-header">
        <h2>${editing ? "Editar produto" : "Novo produto"}</h2>
        ${editing ? `<button class="ghost-button" type="button" data-action="cancel-edit">Cancelar</button>` : ""}
      </div>
      <form class="product-form" id="productForm">
        <div class="form-grid">
          <label class="form-field">
            <span>Produto</span>
            <input name="name" value="${escapeAttr(product.name)}" required />
          </label>
          <label class="form-field">
            <span>Marca</span>
            <input name="brand" value="${escapeAttr(product.brand)}" required />
          </label>
          <label class="form-field">
            <span>Categoria</span>
            <input name="category" value="${escapeAttr(product.category)}" required />
          </label>
          <label class="form-field">
            <span>Valor</span>
            <input name="price" value="${escapeAttr(product.price)}" inputmode="decimal" required />
          </label>
          <label class="form-field">
            <span>Estoque loja física</span>
            <input name="physicalStock" type="number" min="0" step="1" value="${escapeAttr(product.physicalStock)}" required />
          </label>
          <label class="form-field">
            <span>Estoque virtual</span>
            <input name="onlineStock" type="number" min="0" step="1" value="${escapeAttr(product.onlineStock)}" required />
          </label>
          <label class="form-field full">
            <span>Descrição</span>
            <textarea name="description" required>${escapeHtml(product.description)}</textarea>
          </label>
          <label class="form-field full">
            <span>Foto por URL</span>
            <input name="image" value="${escapeAttr(product.image)}" />
          </label>
          <label class="form-field full">
            <span>Enviar foto</span>
            <input id="photoFile" type="file" accept="image/*" />
          </label>
          <div class="form-field">
            <span>Prévia</span>
            <img class="image-preview" src="${escapeAttr(image)}" alt="Prévia do produto" />
          </div>
          <label class="check-field">
            <input name="active" type="checkbox" ${product.active ? "checked" : ""} />
            <span>Produto visível no catálogo</span>
          </label>
        </div>
        <div class="form-actions">
          <button class="primary-button" type="submit">${editing ? "Salvar alterações" : "Incluir produto"}</button>
        </div>
      </form>
    </div>
  `;
}

function renderRestockAlerts() {
  const alerts = state.products.filter(isLowStock);

  return `
    <div class="owner-card">
      <div class="panel-header">
        <h2>Automação de reposição</h2>
        <span class="status-chip">${alerts.length}</span>
      </div>
      <div class="alert-list">
        ${
          alerts.length
            ? alerts.map((product) => `
                <div class="alert-item">
                  <div>
                    <strong>${escapeHtml(product.name)}</strong>
                    <span>Loja ${product.physicalStock} · Virtual ${product.onlineStock}</span>
                  </div>
                  <button class="secondary-button" type="button" data-action="edit-product" data-product-id="${escapeAttr(product.id)}">Ajustar</button>
                </div>
              `).join("")
            : `<div class="empty-state">Estoque saudável.</div>`
        }
      </div>
    </div>
  `;
}

function renderStockRow(product) {
  const activeClass = product.active ? "" : "is-muted";
  const activeLabel = product.active ? "Visível" : "Oculto";

  return `
    <article class="stock-row">
      <img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" />
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.brand)} · ${money(product.price)} · <span class="status-chip ${activeClass}">${activeLabel}</span></p>
        <div class="stock-controls">
          <div class="stock-group">
            <span>Loja ${product.physicalStock}</span>
            <button class="stock-button" type="button" data-action="quick-stock" data-product-id="${escapeAttr(product.id)}" data-field="physicalStock" data-delta="-1">-</button>
            <button class="stock-button" type="button" data-action="quick-stock" data-product-id="${escapeAttr(product.id)}" data-field="physicalStock" data-delta="1">+</button>
          </div>
          <div class="stock-group">
            <span>Virtual ${product.onlineStock}</span>
            <button class="stock-button" type="button" data-action="quick-stock" data-product-id="${escapeAttr(product.id)}" data-field="onlineStock" data-delta="-1">-</button>
            <button class="stock-button" type="button" data-action="quick-stock" data-product-id="${escapeAttr(product.id)}" data-field="onlineStock" data-delta="1">+</button>
          </div>
          <button class="secondary-button" type="button" data-action="edit-product" data-product-id="${escapeAttr(product.id)}">Editar</button>
          <button class="danger-button" type="button" data-action="delete-product" data-product-id="${escapeAttr(product.id)}">Excluir</button>
        </div>
      </div>
    </article>
  `;
}

function renderOwnerOrders() {
  if (!state.orders.length) return `<div class="empty-state">Nenhum pedido registrado.</div>`;

  return `
    <div class="orders-list">
      ${state.orders.map(renderOwnerOrder).join("")}
    </div>
  `;
}

function renderOwnerOrder(order) {
  const itemSummary = order.items.map((item) => `${item.qty}x ${item.name}`).join(", ");

  return `
    <article class="order-item">
      <div class="product-topline">
        <div>
          <h3>${escapeHtml(order.id)} · ${money(order.total)}</h3>
          <p>${formatDate(order.createdAt)} · ${escapeHtml(order.customer.name)} · ${escapeHtml(order.customer.phone)}</p>
          <p>${FULFILLMENT_LABELS[order.fulfillment]} · ${PAYMENT_LABELS[order.payment]} · ${escapeHtml(itemSummary)}</p>
          ${order.fulfillment === "delivery" ? `<p>${escapeHtml(order.customer.address)} ${escapeHtml(order.customer.reference)}</p>` : ""}
        </div>
        <label class="form-field">
          <span>Status</span>
          <select data-action="set-order-status" data-order-id="${escapeAttr(order.id)}">
            ${ORDER_STATUSES.map((status) => `<option ${status === order.status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
          </select>
        </label>
      </div>
    </article>
  `;
}

function isLowStock(product) {
  return product.physicalStock <= LOW_STOCK_LIMIT || product.onlineStock <= LOW_STOCK_LIMIT;
}

function addToCart(productId) {
  const product = getProduct(productId);
  if (!product) return;
  const available = stockForChannel(product);
  const current = state.cart.find((item) => item.productId === productId);
  const currentQty = current?.qty || 0;

  if (available <= currentQty) {
    showToast("Quantidade máxima disponível atingida.");
    return;
  }

  if (current) current.qty += 1;
  else state.cart.push({ productId, qty: 1 });
  saveCart();
  showToast("Produto adicionado ao carrinho.");
}

function changeCartQty(productId, delta) {
  const product = getProduct(productId);
  const item = state.cart.find((cartItem) => cartItem.productId === productId);
  if (!product || !item) return;

  const nextQty = item.qty + delta;
  const maxQty = stockForChannel(product);

  if (nextQty <= 0) {
    state.cart = state.cart.filter((cartItem) => cartItem.productId !== productId);
  } else if (nextQty <= maxQty) {
    item.qty = nextQty;
  } else {
    showToast("Sem estoque suficiente para aumentar.");
    return;
  }

  saveCart();
  render();
}

function removeCartItem(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  saveCart();
  render();
}

function parseNumber(value) {
  const normalized = String(value).trim().replace(/\./g, "").replace(",", ".");
  return Number(normalized) || 0;
}

function handleCheckout(form) {
  if (!form.reportValidity()) return;
  if (!state.cart.length) {
    showToast("Adicione produtos ao carrinho.");
    return;
  }

  const items = cartItems();
  const stockProblem = items.find((item) => item.qty > stockForChannel(item.product));
  if (stockProblem) {
    showToast(`Estoque insuficiente para ${stockProblem.product.name}.`);
    return;
  }

  const data = new FormData(form);
  const customer = {
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    reference: String(data.get("reference") || "").trim()
  };

  const totals = calculateTotals();
  const order = {
    id: `PED-${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    fulfillment: state.ui.fulfillment,
    payment: state.ui.payment,
    status: state.ui.payment === "cash" ? "Reservado" : "Reservado",
    customer,
    items: items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      brand: item.product.brand,
      price: item.product.price,
      qty: item.qty
    })),
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total
  };

  for (const item of items) {
    const product = getProduct(item.productId);
    if (!product) continue;
    if (state.ui.fulfillment === "pickup") {
      product.physicalStock = Math.max(0, product.physicalStock - item.qty);
    } else {
      product.onlineStock = Math.max(0, product.onlineStock - item.qty);
    }
  }

  state.orders.unshift(order);
  state.cart = [];
  if (data.get("saveCustomer")) {
    state.customer = customer;
    saveCustomer();
  }
  saveProducts();
  saveOrders();
  saveCart();
  showToast(`Pedido ${order.id} reservado com sucesso.`);
}

function handleProductSave(form) {
  const data = new FormData(form);
  const editing = state.products.find((product) => product.id === state.ui.editingId);
  const name = String(data.get("name") || "").trim();
  const brand = String(data.get("brand") || "").trim();
  const category = String(data.get("category") || "").trim();
  const description = String(data.get("description") || "").trim();
  const price = parseNumber(data.get("price"));
  const physicalStock = Math.max(0, Math.floor(Number(data.get("physicalStock")) || 0));
  const onlineStock = Math.max(0, Math.floor(Number(data.get("onlineStock")) || 0));
  const image = state.ui.uploadedImage || String(data.get("image") || "").trim() || editing?.image || "assets/products/combo.svg";

  if (!name || !brand || !category || !description || price <= 0) {
    showToast("Preencha os dados do produto corretamente.");
    return;
  }

  const product = normalizeProduct({
    id: editing?.id || createId("prod"),
    name,
    brand,
    category,
    description,
    price,
    physicalStock,
    onlineStock,
    image,
    active: data.get("active") === "on"
  });

  if (editing) {
    state.products = state.products.map((item) => (item.id === editing.id ? product : item));
    showToast("Produto atualizado.");
  } else {
    state.products.unshift(product);
    showToast("Produto incluído no catálogo.");
  }

  state.ui.editingId = "";
  state.ui.uploadedImage = "";
  saveProducts();
}

function handleContact(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const ticket = {
    id: createId("msg"),
    createdAt: new Date().toISOString(),
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    topic: String(data.get("topic") || "Atendimento").trim(),
    message: String(data.get("message") || "").trim(),
    status: "Aberto"
  };
  state.tickets.unshift(ticket);
  state.customer = {
    ...state.customer,
    name: ticket.name,
    phone: ticket.phone
  };
  saveTickets();
  saveCustomer();
  showToast("Mensagem enviada.");
}

function handleAction(button) {
  const action = button.dataset.action;

  if (action === "switch-view") {
    state.ui.view = button.dataset.view;
    render();
    return;
  }

  if (action === "go-cart") {
    state.ui.view = "customer";
    render();
    document.querySelector("#cartPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "set-fulfillment") {
    state.ui.fulfillment = button.dataset.fulfillment;
    render();
    return;
  }

  if (action === "set-category") {
    state.ui.category = button.dataset.category;
    render();
    return;
  }

  if (action === "set-payment") {
    state.ui.payment = button.dataset.payment;
    render();
    return;
  }

  if (action === "copy-pix") {
    navigator.clipboard
      ?.writeText(PIX_KEY)
      .then(() => showToast("Chave Pix copiada."))
      .catch(() => showToast("Chave Pix: " + PIX_KEY));
    return;
  }

  if (action === "add-cart") {
    addToCart(button.dataset.productId);
    return;
  }

  if (action === "inc-cart") {
    changeCartQty(button.dataset.productId, 1);
    return;
  }

  if (action === "dec-cart") {
    changeCartQty(button.dataset.productId, -1);
    return;
  }

  if (action === "remove-cart") {
    removeCartItem(button.dataset.productId);
    return;
  }

  if (action === "owner-logout") {
    state.ownerUnlocked = false;
    sessionStorage.removeItem("da.ownerUnlocked");
    render();
    return;
  }

  if (action === "edit-product") {
    state.ui.editingId = button.dataset.productId;
    state.ui.uploadedImage = "";
    render();
    document.querySelector("#productFormPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "cancel-edit") {
    state.ui.editingId = "";
    state.ui.uploadedImage = "";
    render();
    return;
  }

  if (action === "delete-product") {
    const product = getProduct(button.dataset.productId);
    if (!product) return;
    const confirmed = window.confirm(`Excluir "${product.name}" do catálogo?`);
    if (!confirmed) return;
    state.products = state.products.filter((item) => item.id !== product.id);
    state.cart = state.cart.filter((item) => item.productId !== product.id);
    saveProducts();
    saveCart();
    showToast("Produto excluído.");
    return;
  }

  if (action === "quick-stock") {
    const product = getProduct(button.dataset.productId);
    const field = button.dataset.field;
    const delta = Number(button.dataset.delta) || 0;
    if (!product || !["physicalStock", "onlineStock"].includes(field)) return;
    product[field] = Math.max(0, Number(product[field]) + delta);
    saveProducts();
    render();
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.tagName === "SELECT") return;
  handleAction(button);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.id !== "catalogSearch") return;
  const cursor = target.selectionStart;
  state.ui.query = target.value;
  render();
  requestAnimationFrame(() => {
    const input = document.querySelector("#catalogSearch");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  });
});

document.addEventListener("change", (event) => {
  const target = event.target;

  if (target.id === "photoFile") {
    const file = target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      showToast("Use uma imagem com até 2,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.ui.uploadedImage = String(reader.result || "");
      render();
      document.querySelector("#productFormPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    reader.readAsDataURL(file);
    return;
  }

  if (target.dataset.action === "set-order-status") {
    const order = state.orders.find((item) => item.id === target.dataset.orderId);
    if (!order) return;
    order.status = target.value;
    saveOrders();
    showToast("Status do pedido atualizado.");
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === "ownerLogin") {
    const pin = String(new FormData(form).get("pin") || "");
    if (pin === OWNER_PIN) {
      state.ownerUnlocked = true;
      sessionStorage.setItem("da.ownerUnlocked", "true");
      showToast("Painel liberado.");
    } else {
      showToast("PIN inválido.");
    }
    return;
  }

  if (form.id === "checkoutForm") {
    handleCheckout(form);
    return;
  }

  if (form.id === "productForm") {
    handleProductSave(form);
    return;
  }

  if (form.id === "contactForm") {
    handleContact(form);
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
