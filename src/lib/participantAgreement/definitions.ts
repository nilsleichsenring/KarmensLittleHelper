// src/lib/participantAgreement/definitions.ts

import type { AgreementSectionDefinition } from "./types";

export const AGREEMENT_SECTION_DEFINITIONS: AgreementSectionDefinition[] = [
  {
    id: "intro",
    kind: "paragraph",
    required: true,
    order: 10,
    contentByLanguage: {
      en: {
        title: "Agreement for participation",
        intro:
          "This agreement is prepared before the activity starts and sets out the basic framework for participation in the project.",
        paragraphs: [
          "It defines the main context of the activity, the expected cooperation between the participant and the host organisation, and the basis for organisational preparation.",
        ],
      },
      sl: {
        title: "Dogovor o sodelovanju",
        intro:
          "Ta dogovor se pripravi pred začetkom aktivnosti in določa osnovni okvir sodelovanja v projektu.",
        paragraphs: [
          "Opredeljuje osnovni kontekst aktivnosti, pričakovano sodelovanje med udeležencem in organizacijo ter podlago za organizacijsko pripravo.",
        ],
      },
      de: {
        title: "Teilnahmevereinbarung",
        intro:
          "Diese Vereinbarung wird vor Beginn der Aktivität erstellt und legt den grundlegenden Rahmen für die Teilnahme am Projekt fest.",
        paragraphs: [
          "Sie beschreibt den grundlegenden Kontext der Aktivität, die erwartete Zusammenarbeit zwischen teilnehmender Person und Organisation sowie die Basis für die organisatorische Vorbereitung.",
        ],
      },
    },
  },

  {
    id: "project_summary",
    kind: "paragraph",
    required: true,
    order: 20,
    contentByLanguage: {
      en: {
        title: "Project context",
        paragraphs: [
          "The participant is involved in a project activity organised within the framework of the relevant programme and the project context described by the host organisation.",
          "The final project description, timing, location, and operational details may be specified more precisely in the final agreement content.",
        ],
      },
      sl: {
        title: "Kontekst projekta",
        paragraphs: [
          "Udeleženec sodeluje v projektni aktivnosti, organizirani v okviru ustreznega programa in projektnega konteksta, ki ga določi gostiteljska organizacija.",
          "Končni opis projekta, časovni okvir, lokacija in operativne podrobnosti se lahko natančneje opredelijo v končni vsebini dogovora.",
        ],
      },
      de: {
        title: "Projektkontext",
        paragraphs: [
          "Die teilnehmende Person ist an einer Projektaktivität beteiligt, die im Rahmen des einschlägigen Programms und des von der gastgebenden Organisation beschriebenen Projektkontexts organisiert wird.",
          "Die endgültige Projektbeschreibung, der Zeitrahmen, der Ort und operative Details können in der finalen Vereinbarung später noch genauer festgelegt werden.",
        ],
      },
    },
  },

  {
    id: "host_responsibilities",
    kind: "bullet_list",
    required: true,
    order: 30,
    contentByLanguage: {
      en: {
        title: "Responsibilities of the host organisation",
        bullets: [
          "Provide relevant project information and preparation guidance.",
          "Support the participant during the activity.",
          "Coordinate relevant organisational arrangements where applicable.",
          "Provide the agreed project-related support within the applicable rules.",
        ],
      },
      sl: {
        title: "Naloge gostiteljske organizacije",
        bullets: [
          "Zagotoviti ustrezne informacije o projektu in podporo pri pripravi.",
          "Nuditi podporo udeležencu med aktivnostjo.",
          "Koordinirati ustrezne organizacijske dogovore, kjer je to relevantno.",
          "Zagotoviti dogovorjeno projektno podporo v skladu z veljavnimi pravili.",
        ],
      },
      de: {
        title: "Aufgaben der gastgebenden Organisation",
        bullets: [
          "Relevante Projektinformationen und Hinweise zur Vorbereitung bereitstellen.",
          "Die teilnehmende Person während der Aktivität unterstützen.",
          "Erforderliche organisatorische Absprachen koordinieren, soweit dies relevant ist.",
          "Die vereinbarte projektbezogene Unterstützung im Rahmen der geltenden Regeln bereitstellen.",
        ],
      },
    },
  },

  {
    id: "participant_responsibilities",
    kind: "bullet_list",
    required: true,
    order: 40,
    contentByLanguage: {
      en: {
        title: "Responsibilities of the participant",
        bullets: [
          "Actively take part in the planned activity.",
          "Communicate relevant changes in a timely and responsible way.",
          "Follow the agreed organisational and participation rules.",
          "Contribute respectfully and responsibly during the project activity.",
        ],
      },
      sl: {
        title: "Naloge udeleženca",
        bullets: [
          "Aktivno sodelovati pri načrtovani aktivnosti.",
          "Pravočasno in odgovorno sporočati relevantne spremembe.",
          "Upoštevati dogovorjena organizacijska in vsebinska pravila sodelovanja.",
          "Prispevati spoštljivo in odgovorno med projektno aktivnostjo.",
        ],
      },
      de: {
        title: "Aufgaben der teilnehmenden Person",
        bullets: [
          "Aktiv an der geplanten Aktivität teilnehmen.",
          "Relevante Änderungen rechtzeitig und verantwortungsvoll mitteilen.",
          "Die vereinbarten organisatorischen und inhaltlichen Regeln der Teilnahme einhalten.",
          "Während der Projektaktivität respektvoll und verantwortungsvoll mitwirken.",
        ],
      },
    },
  },

  {
    id: "participant_identity",
    kind: "data_points",
    required: true,
    order: 50,
    contentByLanguage: {
      en: {
        title: "Participant information",
        intro:
          "The following participant information is used as part of this agreement.",
      },
      sl: {
        title: "Podatki o udeležencu",
        intro:
          "Naslednji podatki o udeležencu so del tega dogovora.",
      },
      de: {
        title: "Angaben zur teilnehmenden Person",
        intro:
          "Die folgenden Angaben zur teilnehmenden Person sind Bestandteil dieser Vereinbarung.",
      },
    },
  },

  {
    id: "consent_overview",
    kind: "consent_summary",
    required: true,
    order: 60,
    contentByLanguage: {
      en: {
        title: "Consent overview",
        intro:
          "The agreement includes the participant's current consent choices recorded during onboarding.",
      },
      sl: {
        title: "Pregled soglasij",
        intro:
          "Dogovor vključuje trenutne izbire soglasij, ki jih je udeleženec podal med prijavo.",
      },
      de: {
        title: "Übersicht über Einwilligungen",
        intro:
          "Diese Vereinbarung enthält die aktuell im Onboarding erfassten Einwilligungen der teilnehmenden Person.",
      },
    },
  },

  {
    id: "data_protection",
    kind: "paragraph",
    required: true,
    order: 70,
    contentByLanguage: {
      en: {
        title: "Data protection and processing",
        paragraphs: [
          "Personal data is processed for the preparation, organisation, administration, and documentation of the project activity.",
          "The final agreement may later specify legal, organisational, and retention details more precisely.",
        ],
      },
      sl: {
        title: "Varstvo in obdelava osebnih podatkov",
        paragraphs: [
          "Osebni podatki se obdelujejo za pripravo, organizacijo, administracijo in dokumentiranje projektne aktivnosti.",
          "Končni dogovor lahko kasneje natančneje določi pravne, organizacijske in roke hrambe podatkov.",
        ],
      },
      de: {
        title: "Datenschutz und Datenverarbeitung",
        paragraphs: [
          "Personenbezogene Daten werden für die Vorbereitung, Organisation, Verwaltung und Dokumentation der Projektaktivität verarbeitet.",
          "Die finale Vereinbarung kann rechtliche, organisatorische und aufbewahrungsbezogene Details später noch genauer festlegen.",
        ],
      },
    },
  },

  {
    id: "participation_fee",
    kind: "paragraph",
    required: false,
    order: 80,
    contentByLanguage: {
      en: {
        title: "Participation fee",
        paragraphs: [
          "This section can later be used for rules regarding participation fees, deposits, or reimbursement of such amounts.",
        ],
      },
      sl: {
        title: "Kotizacija oziroma udeležbina",
        paragraphs: [
          "Ta razdelek se lahko kasneje uporabi za pravila glede kotizacije, kavcije ali povračila teh zneskov.",
        ],
      },
      de: {
        title: "Teilnahmegebühr",
        paragraphs: [
          "Dieser Abschnitt kann später für Regelungen zu Teilnahmegebühren, Kautionen oder der Rückerstattung solcher Beträge verwendet werden.",
        ],
      },
    },
  },

  {
    id: "withdrawal_policy",
    kind: "paragraph",
    required: false,
    order: 90,
    contentByLanguage: {
      en: {
        title: "Withdrawal and cancellation",
        paragraphs: [
          "This section can later define the consequences of withdrawal, cancellation timing, and responsibility for incurred costs.",
        ],
      },
      sl: {
        title: "Odstop in odpoved",
        paragraphs: [
          "Ta razdelek lahko kasneje določi posledice odstopa, čas odpovedi in odgovornost za nastale stroške.",
        ],
      },
      de: {
        title: "Rücktritt und Stornierung",
        paragraphs: [
          "Dieser Abschnitt kann später die Folgen eines Rücktritts, den Zeitpunkt einer Absage und die Verantwortung für entstandene Kosten regeln.",
        ],
      },
    },
  },

  {
    id: "travel_cost_notice",
    kind: "paragraph",
    required: false,
    order: 100,
    contentByLanguage: {
      en: {
        title: "Travel cost notice",
        paragraphs: [
          "This section can later define relevant travel cost limitations, reimbursement conditions, and participant responsibilities.",
        ],
      },
      sl: {
        title: "Obvestilo o stroških poti",
        paragraphs: [
          "Ta razdelek lahko kasneje določi omejitve stroškov poti, pogoje povračila in odgovornosti udeleženca.",
        ],
      },
      de: {
        title: "Hinweis zu Reisekosten",
        paragraphs: [
          "Dieser Abschnitt kann später relevante Begrenzungen von Reisekosten, Bedingungen für Erstattungen und die Verantwortlichkeiten der teilnehmenden Person festlegen.",
        ],
      },
    },
  },

  {
    id: "media_consent_clause",
    kind: "paragraph",
    required: false,
    order: 110,
    contentByLanguage: {
      en: {
        title: "Media use clause",
        paragraphs: [
          "This optional section can later contain the final wording for photo, audio, and video use in project communication and dissemination.",
        ],
      },
      sl: {
        title: "Določilo o uporabi medijskih vsebin",
        paragraphs: [
          "Ta opcijski razdelek lahko kasneje vsebuje končno besedilo glede uporabe fotografij, avdio in video gradiva v projektni komunikaciji in razširjanju rezultatov.",
        ],
      },
      de: {
        title: "Klausel zur Nutzung von Medieninhalten",
        paragraphs: [
          "Dieser optionale Abschnitt kann später die endgültige Formulierung zur Nutzung von Fotos, Audio- und Videomaterial in der Projektkommunikation und Verbreitung der Ergebnisse enthalten.",
        ],
      },
    },
  },

  {
    id: "future_projects_clause",
    kind: "paragraph",
    required: false,
    order: 120,
    contentByLanguage: {
      en: {
        title: "Future projects communication clause",
        paragraphs: [
          "This optional section can later define the wording for communication about future projects and activities.",
        ],
      },
      sl: {
        title: "Določilo o obveščanju o prihodnjih projektih",
        paragraphs: [
          "Ta opcijski razdelek lahko kasneje določi besedilo glede obveščanja o prihodnjih projektih in aktivnostih.",
        ],
      },
      de: {
        title: "Klausel zur Kommunikation über zukünftige Projekte",
        paragraphs: [
          "Dieser optionale Abschnitt kann später die Formulierung für die Kommunikation über zukünftige Projekte und Aktivitäten festlegen.",
        ],
      },
    },
  },

  {
    id: "closing",
    kind: "closing",
    required: true,
    order: 130,
    contentByLanguage: {
      en: {
        title: "Confirmation",
        paragraphs: [
          "By confirming this agreement, the participant acknowledges the current agreement structure and the recorded participant information used for this version.",
        ],
        closingNote:
          "The final signed or confirmed version may later contain additional formal elements, such as signatures, dates, or named responsible persons.",
      },
      sl: {
        title: "Potrditev",
        paragraphs: [
          "S potrditvijo tega dogovora udeleženec potrjuje trenutno strukturo dogovora in zabeležene podatke o udeležencu, uporabljene za to različico.",
        ],
        closingNote:
          "Končna podpisana ali potrjena različica lahko kasneje vsebuje dodatne formalne elemente, kot so podpisi, datumi ali imenovane odgovorne osebe.",
      },
      de: {
        title: "Bestätigung",
        paragraphs: [
          "Mit der Bestätigung dieser Vereinbarung bestätigt die teilnehmende Person die aktuelle Struktur der Vereinbarung sowie die für diese Version verwendeten erfassten Angaben.",
        ],
        closingNote:
          "Die endgültig unterzeichnete oder bestätigte Version kann später zusätzliche formale Elemente wie Unterschriften, Daten oder benannte verantwortliche Personen enthalten.",
      },
    },
  },
];