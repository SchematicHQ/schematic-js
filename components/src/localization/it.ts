import type { SchematicTranslations } from "./types";

/**
 * The Italian bundle, contributed by a customer and translated from the
 * English bundle at 2.29.0. It uses the informal "tu", and leaves "Add-on" and
 * "Billing" in English. Any key it leaves out falls back to English.
 */
const it: SchematicTranslations = {
  "A problem occurred while saving your payment method.":
    "Si è verificato un problema durante il salvataggio del metodo di pagamento.",
  "Access to plan will end.": "L'accesso a {{plan}} terminerà il {{date}}.",
  "Active": "Attivo",
  "Add": "Aggiungi",
  "Add new payment method": "Aggiungi un nuovo metodo di pagamento",
  "Add More": "Aggiungi altro",
  "Additional information": "Informazioni aggiuntive",
  "Add-ons": "Add-on",
  "Add-ons Quantity": "Quantità add-on",
  "Additional": "Extra",
  "Adds X tokens when Y remaining in balance":
    "Aggiunge {{amount}} {{unit}} quando nel saldo ne restano {{threshold}}",
  "After the trial, cancel no default":
    "Al termine della prova perderai l'accesso al piano {{planName}} e il tuo abbonamento verrà annullato. Non ti verrà addebitato nulla, a meno che tu non sottoscriva un piano a pagamento durante la prova.",
  "After the trial, cancel":
    "Al termine della prova passerai al piano {{postTrialPlanName}} e il tuo abbonamento verrà annullato. Non ti verrà addebitato nulla, a meno che tu non sottoscriva un piano a pagamento durante la prova.",
  "After the trial, subscribe":
    "Al termine della prova l'abbonamento avrà inizio e ti verrà addebitato.",
  "Agreement": "Accordo",
  "Applied balance towards next invoice":
    "Saldo applicato alla prossima fattura",
  "Discount for months_one": "{{discount}} per il prossimo mese",
  "Discount for months_many":
    "{{discount}} per i prossimi {{count, number}} mesi",
  "Discount for months_other":
    "{{discount}} per i prossimi {{count, number}} mesi",
  "Auto Top-up": "Ricarica automatica",
  "Auto top-up enabled": "Ricarica automatica attiva",
  "Auto top-up disabled": "Ricarica automatica disattivata",
  "Auto top-up disabled for token":
    "Ricarica automatica disattivata per {{unit}}",
  "Automatically purchase more credits when your balance is low":
    "Acquista automaticamente altri {{units}} quando il saldo è basso",
  "at": "a",
  "When balance reaches X remaining, an auto top-up of Y credits will be processed.":
    "Quando il saldo crediti scende a {{threshold}}, verrà effettuata una ricarica automatica di {{amount}} crediti.",
  "An invoice is created when charges reach $X; the rest is billed monthly.":
    "Viene emessa una fattura quando gli addebiti raggiungono {{amount}}; il resto viene fatturato mensilmente.",
  "An unknown error occurred.": "Si è verificato un errore sconosciuto.",
  "Billed": "Fatturazione {{period}}",
  "Bundle selected": "Pacchetto selezionato",
  "Buy credits": "Acquista crediti",
  "Cancel": "Annulla",
  "Country": "Paese",
  "Cancel subscription": "Annulla abbonamento",
  "Cannot change to this plan.":
    "L'utilizzo di {{reason, list(type: 'conjunction')}} supera il limite.",
  "Cannot downgrade entitlement":
    "Non puoi scendere a una quantità inferiore all'utilizzo attuale.",
  "Card ending in": "💳 Carta che termina con {{value}}",
  "Change add-on": "Cambia add-on",
  "Change payment method": "Cambia metodo di pagamento",
  "Change plan": "Cambia piano",
  "Checkout": "Pagamento",
  "Choose add-on": "Scegli l'add-on",
  "Choose bundle": "Scegli il pacchetto",
  "Choose plan": "Scegli il piano",
  "Choose your base plan": "Scegli il tuo piano base",
  "Credit Auto Top-up": "Ricarica automatica di {{unit}}",
  "Credit bundles": "Pacchetti di crediti",
  "Credits": "Crediti",
  "Credits in plan": "Crediti nel piano",
  "Credits to be applied to future invoices":
    "Crediti da applicare alle fatture future",
  "Current plan": "Piano attuale",
  "Current usage exceeds the limit of this plan.":
    "L'utilizzo attuale supera il limite di questo piano.",
  "Currently using": "Attualmente in uso: {{quantity}} {{unit}}",
  "Custom plan awaiting payment": "Paga per attivare {{plan}}",
  "Custom plan awaiting payment description":
    "Paga la fattura per attivare il tuo piano personalizzato. Scadenza: {{date}}.",
  "Custom plan payment due": "Paga entro il {{date}} per mantenere {{plan}}",
  "Custom plan payment due description":
    "L'accesso a {{plan}} terminerà il {{date}} se la fattura non viene pagata.",
  "Custom price": "Prezzo personalizzato",
  "Discount": "Sconto",
  "Downgrade to plan scheduled": "Passaggio a {{plan}} programmato",
  "Due today": "Da pagare oggi",
  "Edit payment details": "Modifica i dati di pagamento",
  "Edit": "Modifica",
  "Ends on": "Termina il {{date}}",
  "Enter discount code": "Inserisci il codice sconto",
  "Error initializing payment method change. Please try again.":
    "Errore durante l'avvio del cambio del metodo di pagamento. Riprova.",
  "Error processing payment. Please try a different payment method.":
    "Errore durante l'elaborazione del pagamento. Prova con un altro metodo di pagamento.",
  "Error retrieving plan details. Please try again in a moment.":
    "Errore durante il recupero dei dettagli del piano. Riprova tra qualche istante.",
  "Error updating payment method. Please try again.":
    "Errore durante l'aggiornamento del metodo di pagamento. Riprova.",
  "Estimated at current usage": "Stima in base al tuo utilizzo attuale",
  "Estimated at current usage with base price":
    "Stima in base al tuo utilizzo attuale. Prezzo base {{amount}}/{{period}}",
  "Estimated bill": "Importo stimato",
  "Everything in": "Tutto quanto incluso in {{plan}}, più",
  "Expired": "Scaduta",
  "Expires in X months": "Mesi alla scadenza: {{months}}",
  "Expires": "Scade il {{date}}",
  "Free": "Gratis",
  "Hide all": "Nascondi tutto",
  "Hide balance details": "Nascondi i dettagli del saldo",
  "Hide details": "Nascondi dettagli",
  "ID type": "Tipo di identificativo",
  "Ineligible for this discount.": "Non hai diritto a questo sconto.",
  "Invalid access token; your temporary access token will start with `token_`.":
    "Token di accesso non valido: il token di accesso temporaneo inizia con `token_`.",
  "Invalid discount code.": "Codice sconto non valido.",
  "Invoice credit tooltip":
    "Credito: questo importo è stato restituito al tuo account, di solito a seguito di un cambio di piano o di un calcolo pro rata",
  "Invoice charge tooltip": "Addebito: questo importo ti è stato fatturato",
  "Invoices": "Fatture",
  "Limit of": "Limite di {{amount}}",
  "Loading": "Caricamento",
  "Manage plan": "Gestisci il piano",
  "Monthly total": "Totale mensile",
  "Quarterly total": "Totale trimestrale",
  "Next": "Avanti",
  "No invoices created yet": "Non è ancora stata emessa nessuna fattura",
  "No limit": "Nessun limite",
  "No payment method added yet": "Nessun metodo di pagamento aggiunto",
  "Not provided": "Non fornito",
  "No upcoming invoice": "Nessuna fattura in arrivo",
  "Not ready to cancel?": "Preferisci non disdire?",
  "On demand": "On demand",
  "One time": "Una tantum",
  "One-time charges": "Addebiti una tantum",
  "Optionally add features to your subscription":
    "Aggiungi funzionalità al tuo abbonamento, se vuoi",
  "Other existing payment method": "Altro metodo di pagamento esistente",
  "Over plan limit": "Oltre il limite del piano",
  "Pay-in-advance features require a quantity.":
    "Le funzionalità a pagamento anticipato richiedono una quantità.",
  "Error saving custom field values. Please try again.":
    "Errore durante il salvataggio dei campi personalizzati. Riprova.",
  "Pay and close": "Paga e chiudi",
  "Pay now": "Paga ora",
  "Payment Details": "Dati di pagamento",
  "Payment due": "Pagamento entro il {{date}}",
  "Plan selected": "Piano selezionato",
  "Please accept the agreement to continue.":
    "Accetta l'accordo per continuare.",
  "Plan": "Piano",
  "Plans": "Piani",
  "Please provide an access token.": "Fornisci un token di accesso.",
  "Powered by": "Con tecnologia",
  "Price by unit based on final tier reached.":
    "Prezzo unitario in base all'ultima fascia raggiunta.",
  "Promotional credits": "Crediti promozionali",
  "Proration": "Pro rata",
  "Quantity": "Quantità",
  "Quantity to pay for in advance": "Quantità da pagare in anticipo",
  "Remaining balance after next invoice":
    "Saldo residuo dopo la prossima fattura",
  "Remove": "Rimuovi",
  "Remove add-on": "Rimuovi add-on",
  "Resets": "Si azzera il {{date}}",
  "Save changes": "Salva modifiche",
  "Save payment method": "Salva metodo di pagamento",
  "Save with yearly billing":
    "Risparmia fino al {{percent}}% con la fatturazione annuale",
  "Saving with yearly billing":
    "Stai risparmiando il {{percent}}% con la fatturazione annuale",
  "Save with quarterly billing":
    "Risparmia fino al {{percent}}% con la fatturazione trimestrale",
  "Saving with quarterly billing":
    "Stai risparmiando il {{percent}}% con la fatturazione trimestrale",
  "See all": "Vedi tutto",
  "See all X": "Vedi tutto ({{total}})",
  "Select ID type": "Seleziona il tipo di identificativo",
  "Select country": "Seleziona il paese",
  "See balance details": "Vedi i dettagli del saldo",
  "See less": "Mostra meno",
  "See more": "Mostra altro",
  "Select add-ons": "Seleziona gli add-on",
  "Select existing payment method":
    "Seleziona un metodo di pagamento esistente",
  "Select payment method": "Seleziona il metodo di pagamento",
  "Select plan": "Seleziona il piano",
  "Select quantity": "Seleziona la quantità",
  "Select quantities for add-ons": "Seleziona le quantità degli add-on",
  "Selected": "Selezionato",
  "Selected plan or associated price is missing.":
    "Manca il piano selezionato o il prezzo associato.",
  "Downgrade not permitted.": "Downgrade non consentito.",
  "Downgrade pending.": "Downgrade in attesa.",
  "Session expired. Please refresh and try again.":
    "Sessione scaduta. Aggiorna la pagina e riprova.",
  "Show details": "Mostra dettagli",
  "Start trial": "Inizia la prova",
  "Start X day trial": "Inizia la prova di {{days}} giorni",
  "Subscribe and close": "Abbonati e chiudi",
  "Subscription canceled": "Abbonamento annullato",
  "Subscription": "Abbonamento",
  "Talk to support": "Contatta l'assistenza",
  "Tax (description):": "Imposte ({{description}}):",
  "Tax ID": "Identificativo fiscale",
  "Tax ID format hint":
    "Non sembra un numero {{label}} nel formato consueto (es. {{example}}): controllalo prima di continuare.",
  "Tax ID save error":
    "Non è stato possibile salvare il tuo identificativo fiscale. Controllalo e riprova.",
  "There was a problem retrieving your upcoming invoice.":
    "Si è verificato un problema durante il recupero della prossima fattura.",
  "There was a problem retrieving your invoices.":
    "Si è verificato un problema durante il recupero delle fatture.",
  "Tier-based": "A fasce",
  "Tiers apply progressively as quantity increases.":
    "Le fasce si applicano progressivamente all'aumentare della quantità.",
  "Top up balance with:": "Ricarica il saldo con:",
  "Top-ups": "Ricariche",
  "Total": "Totale",
  "Trial ends in": "La prova termina tra {{amount}} {{units}}",
  "Trial in progress": "Prova in corso",
  "Trial selected": "Prova selezionata",
  "Trial": "Prova",
  "Try again": "Riprova",
  "Unlimited": "{{item}} senza limiti",
  "Unlimited in this tier": "{{feature}} senza limiti in questa fascia",
  "Unable to load payment form.":
    "Impossibile caricare il modulo di pagamento. Le impostazioni di sicurezza o privacy del browser potrebbero bloccarlo. Prova con un altro browser o modifica le impostazioni della privacy.",
  "Unsubscribe failed": "Disdetta non riuscita",
  "Unsubscribe": "Disdici",
  "Unused time": "Tempo non utilizzato",
  "Up to X units": "Fino a {{amount}} {{units}}",
  "Up to X units per period": "Fino a {{amount}} {{units}} per {{period}}",
  "Up to a limit of": "Fino a un limite di {{amount}} {{units}}",
  "Up to X units at $Y/unit": "Fino a {{X}} {{units}} a {{Y}} per {{unit}}",
  "Up to X units at $Y/unit + $Z/period":
    "Fino a {{X}} {{units}} a {{Y}} per {{unit}} più {{Z}} per {{period}}",
  "Up to X units for $Y/period":
    "Fino a {{X}} {{units}} a {{Y}} per {{period}}",
  "Up to X units for free": "Fino a {{X}} {{units}} gratis",
  "Up to X units in this tier":
    "Fino a {{amount}} {{feature}} in questa fascia",
  "Usage-based": "A consumo",
  "Use existing payment method": "Usa un metodo di pagamento esistente",
  "When balance reaches:": "Quando il saldo scende a:",
  "X additional": "{{amount}} aggiuntivi",
  "X included": "{{amount}} inclusi",
  "X item auto-topup":
    "Ricarica automatica di {{amount}} {{item}} acquistata il {{createdAt}}",
  "X item bundle":
    "Pacchetto di {{amount}} {{item}} acquistato il {{createdAt}}",
  "X item grant":
    "Assegnazione promozionale di {{amount}} {{item}} del {{createdAt}}",
  "X items included in plan": "{{amount}} {{item}} nel piano",
  "X off": "{{amount}} di sconto",
  "X% off": "{{percent}}% di sconto",
  "X units": "{{amount}} {{units}}",
  "X units remaining": "Residuo: {{amount}} {{units}}",
  "X units used": "Utilizzo: {{amount}} {{units}}",
  "X units per use": "{{amount}} {{units}} per utilizzo",
  "X credits per license": "{{amount}} {{creditName}} per {{licenseName}}",
  "X credits per license per period":
    "{{amount}} {{creditName}} per {{licenseName}} per {{period}}",
  "Plus X credits per period": "+ {{amount}} {{creditName}} per {{period}}",
  "Plus X credits per period for your company":
    "+ {{amount}} {{creditName}} per {{period}} per la tua azienda",
  "Includes X credits per license":
    "Include {{amount}} {{creditName}} per {{licenseName}}",
  "X licenses times Y credits":
    "{{quantity}} {{licenseName}} × {{perUnit}} = {{total}} {{creditName}}/{{period}}",
  "X licenses times Y credits plus company":
    "{{quantity}} {{licenseName}} × {{perUnit}} + {{fixed}} = {{total}} {{creditName}}/{{period}}",
  "Credits included": "Crediti inclusi",
  "Your plan includes credits":
    "Il tuo piano include {{total}} {{creditName}}/{{period}}{{composition}}.",
  "credit composition per license":
    "{{quantity}} {{licenseName}} × {{perUnit}}",
  "credit composition company grant": "{{amount}} assegnati all'azienda",
  "Renews on the day": "Si rinnova il giorno {{day}}.",
  "Adding licenses grants more credits today":
    "Aggiungendo {{added}} {{licenseName}} ottieni oggi {{credits}} {{creditName}} in più, calcolati pro rata.",
  "Your full credits renew on the day":
    "L'intera assegnazione di {{total}} {{creditName}} si rinnova con cadenza {{cadence}} il giorno {{day}}.",
  "Your credit grant increases on the day":
    "La tua assegnazione di crediti sale a {{total}} il giorno {{day}}.",
  "Includes X credits per period":
    "Include {{total}} {{creditName}}/{{period}}",
  "Plus X credits today": "+{{amount}} oggi",
  "Plus X credits on the day": "+{{amount}} il giorno {{day}}",
  "X time left in trial": "Ancora {{amount}} {{units}} di prova",
  "Yearly total": "Totale annuale",
  "You will be billed":
    "Ti verrà addebitato {{price}} {{usage}}per questo abbonamento ogni {{period}} {{schedule}}a meno che tu non lo disdica.",
  "You will be billed with discount window":
    "Ti verrà addebitato {{price}} {{usage}}per questo abbonamento ogni {{period}} {{schedule}}{{window}}, poi {{fullPrice}} ogni {{period}}, a meno che tu non lo disdica.",
  "You will be billed next bill discount":
    "Ti verrà addebitato {{price}} {{usage}}per questo abbonamento nella prossima fattura, poi {{fullPrice}} ogni {{period}} {{schedule}}a meno che tu non lo disdica.",
  "plus usage based costs": "più i costi a consumo",
  "on the day": "il giorno {{day}}",
  "of month": "{{month}}",
  "for the next months_one": "per il prossimo mese",
  "for the next months_many": "per i prossimi {{count, number}} mesi",
  "for the next months_other": "per i prossimi {{count, number}} mesi",
  "You will be downgraded at the end of your billing period.":
    "Passerai al piano {{plan}} alla fine del periodo di fatturazione, il {{date}}.",
  "You will retain access to your plan until the end of the billing period, on":
    "Manterrai l'accesso al tuo piano fino alla fine del periodo di fatturazione, il",
  "$X per unit": "{{cost}} per {{unit}}",
  "$X per Y units": "{{cost}} ogni {{size}} {{units}}",
  "$X/unit/period": "{{cost}}/{{unit}}/{{period}}",
  "$X/Y units/period": "{{cost}}/{{size}} {{units}}/{{period}}",
  "day": "giorno",
  "day_one": "giorno",
  "day_many": "giorni",
  "day_other": "giorni",
  "week": "settimana",
  "month": "mese",
  "quarter": "trimestre",
  "year": "anno",
  "mo": "mese",
  "qtr": "trim.",
  "yr": "anno",
  "one time": "una tantum",
  "billing period": "periodo di fatturazione",
  "billing period_one": "periodo di fatturazione",
  "billing period_many": "periodi di fatturazione",
  "billing period_other": "periodi di fatturazione",
  "expires after purchase": "scade {{amount}} {{unit}} dopo l'acquisto",
  "expires at the end of the billing period":
    "scade alla fine del periodo di fatturazione",
  "expires at the end of the next billing period":
    "scade alla fine del prossimo periodo di fatturazione",
  "expires at the end of the trial": "scade alla fine della prova",
  "Ordinal_ordinal_many": "{{count, number}}",
  "Ordinal_ordinal_other": "{{count, number}}",
  "per": "per",
  "then": "poi",
  "use": "utilizzo",
  "used": "utilizzati",
  "license": "licenza",
  "month, billed yearly": "mese, fatturazione annuale",
  "month, billed quarterly": "mese, fatturazione trimestrale",
  "purchased": "acquistato il {{date}}",
  "hour_one": "ora",
  "hour_many": "ore",
  "hour_other": "ore",
  "minute_one": "minuto",
  "minute_many": "minuti",
  "minute_other": "minuti",
  "second_one": "secondo",
  "second_many": "secondi",
  "second_other": "secondi",
  "daily": "giornaliera",
  "weekly": "settimanale",
  "monthly": "mensile",
  "quarterly": "trimestrale",
  "yearly": "annuale",
  "Usage by user": "Utilizzo per utente",
  "X used by your team this period":
    "{{amount}} utilizzati dal tuo team in questo periodo",
  "Show all X users_one": "Mostra {{count, number}} utente",
  "Show all X users_many": "Mostra tutti i {{count, number}} utenti",
  "Show all X users_other": "Mostra tutti i {{count, number}} utenti",
  "Show top X users_one": "Mostra l'utente principale",
  "Show top X users_many": "Mostra i primi {{count, number}} utenti",
  "Show top X users_other": "Mostra i primi {{count, number}} utenti",
  "Show all": "Mostra tutto",
  "Show fewer": "Mostra meno",
  "Unattributed": "Non attribuito",
  "There was a problem retrieving usage by user.":
    "Si è verificato un problema durante il recupero dell'utilizzo per utente.",
  "plus X more_one": "e {{count, number}} altro",
  "plus X more_many": "e altri {{count, number}}",
  "plus X more_other": "e altri {{count, number}}",
  "usage.limited": "{{amount}} su {{allocation}} utilizzati",
  "usage.unlimited": "{{amount}} utilizzati",
  "Apply discount": "Applica sconto",
  "Buy More": "Acquista altro",
  "Choose different payment method": "Scegli un altro metodo di pagamento",
  "Downgrade pending. Cancel the scheduled downgrade before making another change.":
    "Downgrade in attesa. Annulla il downgrade programmato prima di apportare altre modifiche.",
  "Error deleting payment method. Please try again.":
    "Errore durante l'eliminazione del metodo di pagamento. Riprova.",
  "for cost": "per il costo",
  "Invalid currency filter: {{entries}}":
    "Filtro valuta non valido: {{entries}}",
  "No supported currencies are available.":
    "Non è disponibile nessuna valuta supportata.",
  "No {{currency}} price for the {{period}} billing period.":
    "Nessun prezzo in {{currency}} per il periodo di fatturazione {{period}}.",
  "Optionally add credit bundles to your subscription":
    "Aggiungi pacchetti di crediti al tuo abbonamento, se vuoi",
  "Quantity is required.": "La quantità è obbligatoria.",
  "Schedule downgrade": "Programma il downgrade",
  "Select credits": "Seleziona i crediti",
  "Set default": "Imposta come predefinito",
  "This plan is not available in the selected currency and period.":
    "Questo piano non è disponibile nella valuta e nel periodo selezionati.",
  "Tier": "Fascia",
  "your plan": "il tuo piano",
  "Included features": "Funzionalità incluse",
  "Next bill due": "Prossima fattura",
  "Error": "Errore",
  "Portal not found": "Portale non trovato",
  "Please try again later.": "Riprova più tardi.",
  "Email": "Email",
  "Enter email address": "Inserisci l'indirizzo email",
  "Limit": "Limite",
  "Tiered pricing": "Prezzi a fasce",
  "Billing threshold": "Soglia di fatturazione",
};

export default it;
