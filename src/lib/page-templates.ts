export type PageTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  sections: { id: string; component: string; props: Record<string, any> }[];
};

function tplId(templateId: string, component: string, index: number) {
  return `tpl-${templateId}-${component.toLowerCase()}-${index}`;
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "blank",
    name: "Pagina em Branco",
    description: "Uma pagina vazia para voce construir do zero.",
    icon: "📄",
    sections: [],
  },
  {
    id: "landing",
    name: "Landing Page",
    description: "Pagina de conversao com hero, features, depoimentos e CTA.",
    icon: "🚀",
    sections: [
      {
        id: tplId("landing", "Hero", 0),
        component: "Hero",
        props: {
          title: "Transforme sua presenca digital",
          subtitle: "Solucoes completas para o seu negocio crescer online com resultados reais.",
          ctaText: "Comece agora",
          ctaUrl: "#contato",
          backgroundImage: "",
          alignment: "center",
          size: "large",
        },
      },
      {
        id: tplId("landing", "Features", 1),
        component: "Features",
        props: {
          title: "Nossos Diferenciais",
          subtitle: "Descubra por que somos a melhor escolha para o seu projeto.",
          columns: 3,
          features: [
            { title: "Performance", description: "Sites rapidos que convertem mais.", icon: "zap" },
            { title: "Design Moderno", description: "Interfaces bonitas e funcionais.", icon: "palette" },
            { title: "Suporte Dedicado", description: "Equipe pronta para te ajudar.", icon: "headset" },
          ],
        },
      },
      {
        id: tplId("landing", "Stats", 2),
        component: "Stats",
        props: {
          title: "Nossos Numeros",
          stats: [
            { value: "500+", label: "Clientes atendidos" },
            { value: "98%", label: "Satisfacao" },
            { value: "10x", label: "Retorno medio" },
            { value: "24h", label: "Tempo de resposta" },
          ],
        },
      },
      {
        id: tplId("landing", "Testimonials", 3),
        component: "Testimonials",
        props: {
          title: "O que nossos clientes dizem",
          testimonials: [
            { name: "Maria Silva", role: "CEO, Empresa X", text: "Resultado incrivel! Nossas vendas aumentaram 40% no primeiro mes.", avatar: "" },
            { name: "Joao Santos", role: "Diretor, Empresa Y", text: "Profissionalismo e qualidade em cada detalhe do projeto.", avatar: "" },
            { name: "Ana Costa", role: "Fundadora, Empresa Z", text: "Melhor investimento que fizemos para nossa presenca digital.", avatar: "" },
          ],
        },
      },
      {
        id: tplId("landing", "CTA", 4),
        component: "CTA",
        props: {
          title: "Pronto para comecar?",
          subtitle: "Entre em contato e receba uma proposta personalizada para o seu negocio.",
          buttonText: "Falar com especialista",
          buttonUrl: "#contato",
          variant: "primary",
        },
      },
    ],
  },
  {
    id: "institutional",
    name: "Institucional",
    description: "Pagina sobre a empresa com equipe, timeline e formulario de contato.",
    icon: "🏢",
    sections: [
      {
        id: tplId("institutional", "Hero", 0),
        component: "Hero",
        props: {
          title: "Sobre Nos",
          subtitle: "Conheca nossa historia e os valores que nos guiam.",
          backgroundImage: "",
          alignment: "center",
          size: "medium",
        },
      },
      {
        id: tplId("institutional", "ImageText", 1),
        component: "ImageText",
        props: {
          title: "Nossa Missao",
          text: "Acreditamos que a tecnologia deve ser acessivel e transformadora. Trabalhamos todos os dias para entregar solucoes que fazem a diferenca na vida dos nossos clientes.",
          imageUrl: "",
          imageAlt: "Equipe trabalhando",
          imagePosition: "right",
        },
      },
      {
        id: tplId("institutional", "Team", 2),
        component: "Team",
        props: {
          title: "Nossa Equipe",
          subtitle: "Profissionais apaixonados pelo que fazem.",
          members: [
            { name: "Nome do Membro", role: "Cargo", photo: "", bio: "" },
            { name: "Nome do Membro", role: "Cargo", photo: "", bio: "" },
            { name: "Nome do Membro", role: "Cargo", photo: "", bio: "" },
          ],
        },
      },
      {
        id: tplId("institutional", "Timeline", 3),
        component: "Timeline",
        props: {
          title: "Nossa Trajetoria",
          events: [
            { year: "2020", title: "Fundacao", description: "Inicio das atividades com foco em e-commerce." },
            { year: "2021", title: "Expansao", description: "Ampliamos o time e os servicos oferecidos." },
            { year: "2022", title: "Consolidacao", description: "Atingimos a marca de 100 clientes ativos." },
            { year: "2023", title: "Inovacao", description: "Lancamento de produtos proprios e novas tecnologias." },
          ],
        },
      },
      {
        id: tplId("institutional", "ContactForm", 4),
        component: "ContactForm",
        props: {
          title: "Fale Conosco",
          subtitle: "Preencha o formulario e entraremos em contato em ate 24h.",
          fields: ["name", "email", "phone", "message"],
          submitText: "Enviar mensagem",
        },
      },
    ],
  },
  {
    id: "blog",
    name: "Blog",
    description: "Pagina de blog com categorias, grid de posts e newsletter.",
    icon: "📝",
    sections: [
      {
        id: tplId("blog", "CategoryBar", 0),
        component: "CategoryBar",
        props: {
          title: "Categorias",
          showAll: true,
          layout: "horizontal",
        },
      },
      {
        id: tplId("blog", "PostGrid", 1),
        component: "PostGrid",
        props: {
          title: "Ultimos Artigos",
          columns: 3,
          postsPerPage: 9,
          showExcerpt: true,
          showAuthor: true,
          showDate: true,
          showCategory: true,
        },
      },
      {
        id: tplId("blog", "Newsletter", 2),
        component: "Newsletter",
        props: {
          title: "Receba nossos conteudos",
          subtitle: "Cadastre seu e-mail e fique por dentro das novidades.",
          placeholder: "Seu melhor e-mail",
          buttonText: "Inscrever-se",
        },
      },
    ],
  },
  {
    id: "products",
    name: "Catalogo de Produtos",
    description: "Vitrine de produtos com destaque e botao de WhatsApp.",
    icon: "🛍️",
    sections: [
      {
        id: tplId("products", "ProductShowcase", 0),
        component: "ProductShowcase",
        props: {
          title: "Nossos Produtos",
          subtitle: "Confira nosso catalogo completo.",
          columns: 3,
          showPrice: true,
          showCategory: true,
          layout: "grid",
        },
      },
      {
        id: tplId("products", "WhatsAppCTA", 1),
        component: "WhatsAppCTA",
        props: {
          title: "Ficou com duvida?",
          subtitle: "Fale com nosso time pelo WhatsApp e tire todas as suas duvidas.",
          phoneNumber: "",
          message: "Ola! Gostaria de saber mais sobre os produtos.",
          buttonText: "Chamar no WhatsApp",
        },
      },
    ],
  },
  {
    id: "faq",
    name: "FAQ",
    description: "Pagina de perguntas frequentes com hero compacto e CTA.",
    icon: "❓",
    sections: [
      {
        id: tplId("faq", "Hero", 0),
        component: "Hero",
        props: {
          title: "Perguntas Frequentes",
          subtitle: "Encontre respostas para as duvidas mais comuns.",
          alignment: "center",
          size: "small",
        },
      },
      {
        id: tplId("faq", "FAQ", 1),
        component: "FAQ",
        props: {
          title: "",
          items: [
            { question: "Qual o prazo de entrega?", answer: "O prazo medio e de 5 a 10 dias uteis, dependendo da sua regiao." },
            { question: "Quais formas de pagamento?", answer: "Aceitamos cartao de credito, PIX e boleto bancario." },
            { question: "Como faco para trocar um produto?", answer: "Entre em contato conosco em ate 7 dias apos o recebimento." },
            { question: "Vocxes oferecem suporte?", answer: "Sim! Nosso time esta disponivel de segunda a sexta, das 9h as 18h." },
            { question: "Tem programa de fidelidade?", answer: "Sim, acumule pontos a cada compra e troque por descontos exclusivos." },
          ],
        },
      },
      {
        id: tplId("faq", "CTA", 2),
        component: "CTA",
        props: {
          title: "Ainda com duvidas?",
          subtitle: "Nossa equipe esta pronta para te ajudar. Entre em contato!",
          buttonText: "Falar com suporte",
          buttonUrl: "/contato",
          variant: "secondary",
        },
      },
    ],
  },
  {
    id: "contact",
    name: "Contato",
    description: "Pagina de contato com formulario e mapa.",
    icon: "📬",
    sections: [
      {
        id: tplId("contact", "Hero", 0),
        component: "Hero",
        props: {
          title: "Entre em Contato",
          subtitle: "Estamos prontos para atender voce.",
          alignment: "center",
          size: "small",
        },
      },
      {
        id: tplId("contact", "ContactForm", 1),
        component: "ContactForm",
        props: {
          title: "Envie sua mensagem",
          subtitle: "Preencha os campos abaixo e retornaremos em ate 24h.",
          fields: ["name", "email", "phone", "subject", "message"],
          submitText: "Enviar",
        },
      },
      {
        id: tplId("contact", "Map", 2),
        component: "Map",
        props: {
          title: "Onde estamos",
          address: "",
          embedUrl: "",
          showAddress: true,
          showPhone: true,
          showEmail: true,
          phone: "",
          email: "",
        },
      },
    ],
  },
];

export function getTemplateById(id: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find((t) => t.id === id);
}
