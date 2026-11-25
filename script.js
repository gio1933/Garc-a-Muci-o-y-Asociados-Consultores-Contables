const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = "72d96d67-88d8-479c-bae6-350602e24d18";
const CORREO_DESTINO = "gio_1933@hotmail.com";
const WHATSAPP_NUMERO_PRUEBA = "5215633212233";
const ABRIR_WHATSAPP_AUTOMATICAMENTE = true;

// Estado conversacional del chatbot guiado
const chatState = {
  step: "SELECT_SERVICE",
  data: {
    servicio: "",
    nombre: "",
    telefono: "",
    correo: "",
    detalle: "",
  },
};

// Inicializa el chatbot al cargar el DOM y registra el listener de #form
document.addEventListener("DOMContentLoaded", () => {
  resetChatFlow(true);
  initContactFormWeb3Forms();
});

// Abre WhatsApp con respaldo en caso de bloqueo de ventanas emergentes
function openWhatsAppUrl(whatsappUrl) {
  const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.href = whatsappUrl;
  }
}

// Configura el envío de #form usando FormData y fetch() hacia Web3Forms + WhatsApp
function initContactFormWeb3Forms() {
  const form = document.getElementById("form");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const feedback = document.getElementById("form-feedback");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const lead = getValidatedContactFormData();
    if (!lead) return;

    const whatsappUrl = buildWhatsAppUrl(lead);

    const formData = new FormData(form);
    formData.append("access_key", WEB3FORMS_ACCESS_KEY);
    formData.append(
      "subject",
      `[García Muciño] Cotización - ${lead.servicio} (${lead.nombre})`,
    );
    formData.append(
      "from_name",
      "García Muciño y Asociados • Consultoría Contable",
    );
    formData.append("recipient_email", CORREO_DESTINO);
    formData.append("origen", lead.origen);
    formData.append("fecha", lead.fecha);

    const labelSpan = submitBtn ? submitBtn.querySelector("span") : null;
    const originalText = labelSpan
      ? labelSpan.textContent
      : submitBtn
        ? submitBtn.textContent
        : "Enviar";

    if (submitBtn) {
      if (labelSpan) {
        labelSpan.textContent = "Sending...";
      } else {
        submitBtn.textContent = "Sending...";
      }
      submitBtn.disabled = true;
    }

    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (feedback) {
          feedback.className =
            "p-4 rounded-xl text-sm font-medium bg-emerald-950 text-emerald-100 border border-emerald-500 block animate-fade-up";
          feedback.innerHTML = `
                <strong class="text-emerald-300">¡Cotización enviada exitosamente!</strong><br/>
                Su solicitud de <strong>${escapeHtml(lead.servicio)}</strong> fue enviada hacia <strong>${escapeHtml(CORREO_DESTINO)}</strong> y preparada en WhatsApp.
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500">Enviar / Abrir en WhatsApp</a>
                </div>
              `;
        }
        form.reset();

        if (ABRIR_WHATSAPP_AUTOMATICAMENTE) {
          openWhatsAppUrl(whatsappUrl);
        }
      } else {
        if (feedback) {
          feedback.className =
            "p-4 rounded-xl text-sm font-semibold bg-amber-950 text-amber-100 border border-[#C99A2E] block animate-fade-up";
          feedback.innerHTML = `
                <strong>Aviso al enviar por correo:</strong> ${escapeHtml(data.message || "No se pudo completar el envío por correo.")}<br/>
                Abriendo WhatsApp para enviar su cotización directamente.
                <div class="mt-3 flex flex-wrap gap-2">
                  <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500">Enviar por WhatsApp</a>
                </div>
              `;
        }

        if (ABRIR_WHATSAPP_AUTOMATICAMENTE) {
          openWhatsAppUrl(whatsappUrl);
        }
      }
    } catch (error) {
      if (feedback) {
        feedback.className =
          "p-4 rounded-xl text-sm font-semibold bg-amber-950 text-amber-100 border border-[#C99A2E] block animate-fade-up";
        feedback.innerHTML = `
              <strong>No fue posible conectar con el servicio de correo.</strong> Abriendo WhatsApp para enviar su cotización.
              <div class="mt-3 flex flex-wrap gap-2">
                <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500">Enviar por WhatsApp</a>
              </div>
            `;
      }

      if (ABRIR_WHATSAPP_AUTOMATICAMENTE) {
        openWhatsAppUrl(whatsappUrl);
      }
    } finally {
      if (submitBtn) {
        if (labelSpan) {
          labelSpan.textContent = originalText;
        } else {
          submitBtn.textContent = originalText;
        }
        submitBtn.disabled = false;
      }
    }
  });
}

// Envía las respuestas capturadas por el chatbot hacia Web3Forms usando FormData
async function sendChatbotFormData(lead) {
  const payload = new FormData();
  payload.append("access_key", WEB3FORMS_ACCESS_KEY);
  payload.append(
    "subject",
    `[García Muciño Chatbot] Cotización - ${lead.servicio} (${lead.nombre})`,
  );
  payload.append("from_name", "Chatbot García Muciño y Asociados");
  payload.append("recipient_email", CORREO_DESTINO);
  payload.append("origen", lead.origen);
  payload.append("name", lead.nombre);
  payload.append("phone", lead.telefono);
  payload.append("email", lead.correo);
  payload.append("service", lead.servicio);
  payload.append("message", lead.detalle);
  payload.append("fecha", lead.fecha);

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    body: payload,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Error al enviar la cotización desde el chatbot.",
    );
  }

  return data;
}

/**
 * Alterna el menú de navegación móvil
 */
function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.toggle("hidden");
}

// Abre o cierra la ventana del chatbot
function toggleChatWidget(forceState) {
  const win = document.getElementById("chatbot-window");
  if (!win) return;
  if (typeof forceState === "boolean") {
    win.classList.toggle("hidden", !forceState);
  } else {
    win.classList.toggle("hidden");
  }
}

// Reinicia el flujo conversacional del chatbot
function resetChatFlow(isInitial = false) {
  chatState.step = "SELECT_SERVICE";
  chatState.data = {
    servicio: "",
    nombre: "",
    telefono: "",
    correo: "",
    detalle: "",
  };

  const container = document.getElementById("chat-messages");
  const quickReplies = document.getElementById("chat-quick-replies");
  const input = document.getElementById("chat-input");

  if (container) container.innerHTML = "";
  if (quickReplies) quickReplies.classList.remove("hidden");
  if (input) {
    input.value = "";
    input.placeholder = "Seleccione un servicio o escriba aquí...";
    input.disabled = false;
  }

  appendChatMessage(
    "Bienvenido a <strong>García Muciño y Asociados • Consultoría Contable</strong>.<br/><br/>Seleccione el área contable de su interés o escriba su consulta para preparar su cotización:",
    "bot",
    !isInitial,
  );
}

// Selecciona servicio desde los botones rápidos del chatbot
function selectChatService(servicio) {
  appendChatMessage(servicio, "user");
  chatState.data.servicio = servicio;
  chatState.step = "ASK_NAME";

  const quickReplies = document.getElementById("chat-quick-replies");
  const input = document.getElementById("chat-input");
  if (quickReplies) quickReplies.classList.add("hidden");
  if (input) input.placeholder = "Escriba su nombre completo...";

  setTimeout(() => {
    appendChatMessage(
      `Perfecto. Preparamos su cotización para <strong>${escapeHtml(servicio)}</strong>.<br/><br/>Por favor indíqueme su <strong>nombre completo</strong>:`,
      "bot",
    );
  }, 260);
}

// Captura el mensaje escrito por el usuario en el chatbot
function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage(text, "user");
  input.value = "";
  processChatStep(text);
}

// Avanza por los pasos de captura del chatbot con validación básica
async function processChatStep(userInput) {
  const input = document.getElementById("chat-input");

  if (chatState.step === "SELECT_SERVICE") {
    chatState.data.servicio = "Cotización de Consultoría Contable";
    chatState.data.detalle = userInput;
    chatState.step = "ASK_NAME";

    const quickReplies = document.getElementById("chat-quick-replies");
    if (quickReplies) quickReplies.classList.add("hidden");
    if (input) input.placeholder = "Escriba su nombre completo...";

    setTimeout(() => {
      appendChatMessage(
        "Gracias por su mensaje. Para enviar su cotización a <strong>gio_1933@hotmail.com</strong> y WhatsApp, por favor indíqueme su <strong>nombre completo</strong>:",
        "bot",
      );
    }, 260);
    return;
  }

  if (chatState.step === "ASK_NAME") {
    if (userInput.length < 3) {
      setTimeout(() => {
        appendChatMessage(
          "Por favor ingrese un <strong>nombre completo</strong> válido (mínimo 3 caracteres).",
          "bot",
        );
      }, 200);
      return;
    }
    chatState.data.nombre = userInput;
    chatState.step = "ASK_PHONE";
    if (input) input.placeholder = "Ej. 55 1234 5678";

    setTimeout(() => {
      appendChatMessage(
        `Gracias, <strong>${escapeHtml(chatState.data.nombre)}</strong>. ¿Cuál es su <strong>teléfono o WhatsApp</strong> (10 dígitos)?`,
        "bot",
      );
    }, 260);
    return;
  }

  if (chatState.step === "ASK_PHONE") {
    const digits = userInput.replace(/\D/g, "");
    if (digits.length < 10) {
      setTimeout(() => {
        appendChatMessage(
          "Por favor ingrese un número telefónico válido de al menos <strong>10 dígitos</strong>.",
          "bot",
        );
      }, 200);
      return;
    }
    chatState.data.telefono = userInput;
    chatState.step = "ASK_EMAIL";
    if (input) input.placeholder = "Ej. contacto@empresa.com.mx";

    setTimeout(() => {
      appendChatMessage(
        "Ahora indíqueme su <strong>correo electrónico</strong>:",
        "bot",
      );
    }, 260);
    return;
  }

  if (chatState.step === "ASK_EMAIL") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userInput)) {
      setTimeout(() => {
        appendChatMessage(
          "Ingrese un <strong>correo electrónico</strong> válido (ej. nombre@empresa.com):",
          "bot",
        );
      }, 200);
      return;
    }
    chatState.data.correo = userInput;

    if (chatState.data.detalle) {
      chatState.step = "COMPLETED";
      await finalizeChatLead();
      return;
    }

    chatState.step = "ASK_DETAIL";
    if (input) input.placeholder = "Ej. Giro comercial, 15 colaboradores...";

    setTimeout(() => {
      appendChatMessage(
        "Por último, escriba brevemente el <strong>giro de su empresa o detalle</strong> de la cotización:",
        "bot",
      );
    }, 260);
    return;
  }

  if (chatState.step === "ASK_DETAIL") {
    if (userInput.length < 4) {
      setTimeout(() => {
        appendChatMessage(
          "Por favor escriba un breve detalle o giro de su empresa para completar la cotización.",
          "bot",
        );
      }, 200);
      return;
    }
    chatState.data.detalle = userInput;
    chatState.step = "COMPLETED";
    await finalizeChatLead();
    return;
  }

  if (chatState.step === "COMPLETED") {
    setTimeout(() => {
      appendChatMessage(
        "Esta cotización ya fue procesada. Pulse <strong>Reiniciar</strong> si desea enviar otra consulta.",
        "bot",
      );
    }, 200);
  }
}

// Envía la cotización del chatbot por FormData a Web3Forms y abre WhatsApp
async function finalizeChatLead() {
  const chatForm = document.querySelector("#chatbot-window form");
  const submitBtn = chatForm
    ? chatForm.querySelector('button[type="submit"]')
    : null;
  const input = document.getElementById("chat-input");
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";

  const lead = {
    origen: "Chatbot Web - García Muciño y Asociados",
    ...chatState.data,
    fecha: new Date().toLocaleString("es-MX"),
  };

  const whatsappUrl = buildWhatsAppUrl(lead);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="text-[11px] font-bold px-1">Sending...</span>';
  }
  if (input) {
    input.disabled = true;
    input.placeholder = "Sending...";
  }

  try {
    await sendChatbotFormData(lead);

    const successCard = `
          <div class="space-y-2.5">
            <div class="p-2.5 rounded-xl bg-emerald-950/85 border border-emerald-500/50 text-emerald-200 text-xs">
              <strong>¡Cotización enviada!</strong> Se transmitió a <strong>${escapeHtml(CORREO_DESTINO)}</strong> y se abrió WhatsApp.
            </div>
            <div class="p-2.5 rounded-xl bg-[#071926] border border-[#C99A2E]/35 text-xs space-y-1">
              <p><strong class="text-[#DFB348]">Servicio:</strong> ${escapeHtml(lead.servicio)}</p>
              <p><strong class="text-[#DFB348]">Nombre:</strong> ${escapeHtml(lead.nombre)}</p>
              <p><strong class="text-[#DFB348]">Teléfono:</strong> ${escapeHtml(lead.telefono)}</p>
              <p><strong class="text-[#DFB348]">Correo:</strong> ${escapeHtml(lead.correo)}</p>
              <p><strong class="text-[#DFB348]">Detalle:</strong> ${escapeHtml(lead.detalle)}</p>
            </div>
            <div class="pt-1 flex flex-col gap-2">
              <a
                href="${whatsappUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition-colors shadow">
                Enviar / Abrir en WhatsApp
              </a>
              <button
                type="button"
                onclick="resetChatFlow()"
                class="w-full py-1.5 px-3 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-[#C99A2E] text-[11px] font-medium transition-colors">
                Iniciar Nueva Cotización
              </button>
            </div>
          </div>
        `;
    appendChatMessage(successCard, "bot");

    if (ABRIR_WHATSAPP_AUTOMATICAMENTE) {
      openWhatsAppUrl(whatsappUrl);
    }
  } catch (error) {
    const errorCard = `
          <div class="space-y-2.5">
            <div class="p-2.5 rounded-xl bg-amber-950/85 border border-[#C99A2E]/60 text-[#FDE68A] text-xs">
              <strong>No se pudo enviar por correo automáticamente:</strong> ${escapeHtml(error.message || "Intente nuevamente.")}<br/>
              Abriendo WhatsApp para enviar su cotización.
            </div>
            <div class="pt-1 flex flex-col gap-2">
              <a
                href="${whatsappUrl}"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition-colors shadow"
              >
                Enviar por WhatsApp
              </a>
              <button
                type="button"
                onclick="resetChatFlow()"
                class="w-full py-1.5 px-3 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-[#C99A2E] text-[11px] font-medium transition-colors"
              >
                Reiniciar Chat
              </button>
            </div>
          </div>
        `;
    appendChatMessage(errorCard, "bot");

    if (ABRIR_WHATSAPP_AUTOMATICAMENTE) {
      openWhatsAppUrl(whatsappUrl);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
    if (input) {
      input.disabled = false;
      input.placeholder = "Pulse Reiniciar para otra consulta";
    }
  }
}

// Genera la URL de WhatsApp con el resumen de cotización
function buildWhatsAppUrl(lead) {
  const cleanPhone = String(WHATSAPP_NUMERO_PRUEBA || "").replace(/\D/g, "");
  const lines = [
    "*Cotización / Consulta - García Muciño y Asociados • Consultoría Contable*",
    `• *Origen:* ${lead.origen}`,
    `• *Correo Receptor:* ${CORREO_DESTINO}`,
    `• *Servicio:* ${lead.servicio}`,
    `• *Nombre:* ${lead.nombre}`,
    `• *Teléfono:* ${lead.telefono}`,
    `• *Correo Cliente:* ${lead.correo}`,
    `• *Detalle:* ${lead.detalle}`,
    `• *Fecha:* ${lead.fecha}`,
  ];
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

// Inserta un mensaje en el historial del chatbot y desplaza el scroll al final
function appendChatMessage(content, sender, animate = true) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  const bubble = document.createElement("div");

  if (sender === "user") {
    bubble.className =
      "ml-auto max-w-[82%] bg-[#C99A2E] text-[#0B2538] font-semibold rounded-2xl rounded-tr-none p-3 text-xs sm:text-sm shadow";
    bubble.textContent = content;
  } else {
    bubble.className = `mr-auto max-w-[92%] bg-[#0F344C] border border-[#C99A2E]/40 text-[#FAF8F5] rounded-2xl rounded-tl-none p-3 text-xs sm:text-sm leading-relaxed ${animate ? "animate-fade-up" : ""}`;
    bubble.innerHTML = content;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// Escapa caracteres HTML para evitar inyección en mensajes dinámicos
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Valida los campos obligatorios del formulario principal (id="form")
function getValidatedContactFormData() {
  const nombreEl = document.getElementById("nombre");
  const empresaEl = document.getElementById("empresa");
  const telefonoEl = document.getElementById("telefono");
  const correoEl = document.getElementById("correo");
  const servicioEl = document.getElementById("servicio");
  const mensajeEl = document.getElementById("mensaje");
  const feedback = document.getElementById("form-feedback");
  const nombre = nombreEl ? nombreEl.value.trim() : "";
  const empresa = empresaEl ? empresaEl.value.trim() : "";
  const telefono = telefonoEl ? telefonoEl.value.trim() : "";
  const correo = correoEl ? correoEl.value.trim() : "";
  const servicio = servicioEl ? servicioEl.value : "Contabilidad General";
  const mensaje = mensajeEl ? mensajeEl.value.trim() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = telefono.replace(/\D/g, "");

  if (!feedback) return null;

  if (
    !nombre ||
    phoneDigits.length < 10 ||
    !emailRegex.test(correo) ||
    !mensaje
  ) {
    feedback.className =
      "p-4 rounded-xl text-sm font-semibold bg-red-100 text-red-900 border border-red-300 block animate-fade-up";
    feedback.textContent =
      "Por favor complete su nombre, un teléfono válido de al menos 10 dígitos, un correo electrónico válido y el detalle de su requerimiento.";
    return null;
  }

  return {
    origen: "Formulario de Contacto - García Muciño y Asociados",
    servicio,
    nombre,
    telefono,
    correo,
    detalle: empresa ? `Empresa: ${empresa} | ${mensaje}` : mensaje,
    fecha: new Date().toLocaleString("es-MX"),
  };
}

// Abre WhatsApp con los datos validados del formulario principal
function handleContactWhatsApp() {
  const lead = getValidatedContactFormData();
  if (!lead) return;

  const feedback = document.getElementById("form-feedback");
  const whatsappUrl = buildWhatsAppUrl(lead);

  if (feedback) {
    feedback.className =
      "p-4 rounded-xl text-sm font-medium bg-[#0B2538] text-[#FAF8F5] border border-[#C99A2E] block animate-fade-up";
    feedback.innerHTML = `
          <strong class="text-[#C99A2E]">¡Resumen listo para WhatsApp!</strong><br/>
          Se preparó el mensaje hacia <em>+${escapeHtml(WHATSAPP_NUMERO_PRUEBA)}</em> (correo configurado: <em>${escapeHtml(CORREO_DESTINO)}</em>).
          <div class="mt-3 flex flex-wrap gap-2">
            <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500">Abrir WhatsApp</a>
          </div>
        `;
  }

  openWhatsAppUrl(whatsappUrl);
}