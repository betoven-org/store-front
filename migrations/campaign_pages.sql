-- Migration: campaign_pages
-- Cria tabela e insere conteúdo das 3 landing pages de campanha

CREATE TABLE IF NOT EXISTS campaign_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text,
  og_image text,
  sections jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO campaign_pages (slug, title, meta_description, og_image, sections) VALUES
('campanhas/maca-peruana', 'Maca Peruana – Benefícios, Indicações e Como Tomar', 'Descubra os benefícios da Maca Peruana, suas indicações e como pode auxiliar na energia, disposição e equilíbrio hormonal. Compre na Medicinal na Web.', 'https://assets.decocache.com/medicinal-store/d1335d5d-9874-40ac-b691-54cb41d3315c/Frame-1.svg',
'[
  {
    "type": "hero",
    "eyebrow": "a raiz dos Andes",
    "heading": "Maca Peruana Benefícios e Indicações",
    "description": "Uma raiz originária dos Andes, rica em vitaminas e minerais, conhecida por ajudar a aumentar a energia, melhorar a disposição física e mental, além de contribuir para o equilíbrio hormonal e a libido."
  },
  {
    "type": "trust_badges",
    "items": [
      {"icon": "https://assets.decocache.com/medicinal-store/17c74eb0-abc2-4fb1-a6ce-f51b0fa15c51/ShieldCheck.png", "text": "Segurança dos Produtos"},
      {"icon": "https://assets.decocache.com/medicinal-store/81cdbf4c-f6ad-496a-9cb6-6f2dc82b8e46/Vector-(4).svg", "text": "Produção Farmacêutica Certificada"},
      {"icon": "https://assets.decocache.com/medicinal-store/c6ef5bbe-03e7-4809-809e-6f24f286a0fe/Vector-(3).svg", "text": "Matérias Primas Originais"},
      {"icon": "https://assets.decocache.com/medicinal-store/b10cb942-793d-483d-9587-62ce41f3982f/Star.svg", "text": "Entrega Rápida e Garantida"}
    ]
  },
  {
    "type": "image_text",
    "heading": "Maca Peruana",
    "text": "A Maca Peruana, também conhecida como \"ginseng dos Andes\" é uma planta originária da região andina do Peru. Rica em proteínas, fibras, vitaminas, minerais e outros nutrientes essenciais, ela é amplamente utilizada por suas propriedades adaptogênicas, que podem ajudar o corpo a se adaptar ao stress. A é tradicionalmente usada para aumentar a energia, a resistência e a libido, além de oferecer benefícios para a saúde reprodutiva e hormonal. Além disso, alguns estudos sugerem que ela pode ter benefícios para a memória e a aprendizagem.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/372f57a9-f59a-4250-8613-49be0e0de4d6/maca-peruana.png", "alt": "Maca Peruana"}
  },
  {
    "type": "text_image",
    "heading": "O Que é Maca Peruana?",
    "text": "A Maca Peruana, ou Lepidium meyenii, é uma planta medicinal com origem nos Andes, no Peru. Cultivada em altitudes acima de 4 mil metros há mais de dois mil anos, essa raiz poderosa conquistou seu lugar como um dos suplementos naturais mais populares do mundo. Rica em nutrientes e repleta de benefícios, a Maca Peruana é reconhecida por promover energia, equilíbrio hormonal e bem-estar geral, sendo uma aliada indispensável para quem busca melhorar a saúde de forma natural.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/0680563d-dbf6-4190-9dab-9b4bb1821178/maca-mobile.jpg", "alt": "Maca Peruana"}
  },
  {
    "type": "text_image",
    "heading": "Para Que Serve a Maca Peruana?",
    "text": "A Maca Peruana é um suplemento natural amplamente reconhecido por sua capacidade de aumentar a disposição e o vigor. Originária dos Andes, no Peru, essa raiz tem sido usada há séculos para melhorar a energia de forma natural, sendo uma excelente escolha para quem busca enfrentar o dia a dia com mais vitalidade. Com uma composição rica em nutrientes, a Maca Peruana ajuda a combater o cansaço físico e mental, promovendo maior resistência e disposição. Além disso, suas propriedades adaptogênicas auxiliam o corpo a lidar melhor com o estresse, equilibrando as funções do organismo e favorecendo o bem-estar geral. Outro destaque da maca peruana é sua atuação no suporte ao sistema hormonal. Embora não seja um tratamento específico, ela contribui para o equilíbrio hormonal de forma natural, o que pode ajudar a manter uma sensação de vitalidade constante. O consumo da Maca Peruana também fortalece o sistema imunológico, tornando o corpo mais preparado para os desafios diários.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/d23ddcfd-9dac-493a-825f-48fb2e2b2916/maca-peruana-disposicao.png", "alt": "Maca Peruana disposição"}
  },
  {
    "type": "benefits_icons",
    "items": [
      {"icon": "https://assets.decocache.com/medicinal-store/3bc44dd8-c9c3-4a6a-a6ae-77542d141c69/scales_10228254.png", "text": "Equilibra os hormônios naturalmente."},
      {"icon": "https://assets.decocache.com/medicinal-store/e16fe5cb-bb6c-46ab-a377-13819060f922/strength_908893.png", "text": "Aumenta a força e a performance."},
      {"icon": "https://assets.decocache.com/medicinal-store/49a20f96-d289-47ce-9864-507f9e0284fc/speedometer_2508323.png", "text": "Melhora o desempenho íntimo."}
    ]
  },
  {
    "type": "image_text",
    "heading": "Maca Peruana e seus benefícios",
    "text": "Além de seus efeitos afrodisíacos, a Maca Peruana é rica em carboidratos, proteínas, fibras e minerais. Estudos indicam que ela possui atividades espermatogênicas e de aumento da fertilidade. Além disso, a Maca Peruana é rica em metabólitos secundários, incluindo alcaloides, flavonoides e esteroides, que podem explicar seu uso como medicamento natural.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/e58932e0-d3f6-4032-aab5-761cd0d88856/maca-peruana-aliado.png", "alt": "Maca Peruana aliado"}
  },
  {
    "type": "text_image",
    "heading": "Maca Peruana emagrece?",
    "text": "A Maca Peruana não é um alimento diretamente ligado ao emagrecimento, mas pode ser uma excelente aliada para quem busca perder peso de maneira saudável e sustentável. Essa raiz é conhecida por melhorar a disposição e promover o equilíbrio hormonal, aspectos que influenciam indiretamente no processo de perda de peso. Ao consumir Maca Peruana, muitas pessoas relatam um aumento significativo na energia e no vigor. Com mais energia, o corpo consegue realizar treinos mais intensos e consistentes, potencializando os resultados. Outro ponto relevante é o papel da Maca Peruana na regulação hormonal. Desequilíbrios nos hormônios podem dificultar o emagrecimento. Ao ajudar o corpo a equilibrar esses processos, a Maca Peruana pode contribuir para que o organismo funcione de forma mais eficiente, tornando o caminho para a perda de peso menos complicado. Embora a Maca Peruana não atue diretamente no metabolismo, ela favorece o uso mais eficiente da energia pelo organismo.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/141e4f92-7d22-4b22-9654-e222e2047a38/maca-casal-desktop.jpg", "alt": "Maca Peruana casal"}
  },
  {
    "type": "image_text",
    "heading": "Maca Peruana benefícios feminino",
    "text": "A Maca Peruana é amplamente reconhecida por seus benefícios à saúde, principalmente na melhora do desempenho sexual. Ela também é conhecida por aumentar a produção de espermatozoides e a fertilidade feminina.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/4cc78a52-7229-4240-8b49-650787b12cac/maca-mobile.png", "alt": "Maca Peruana feminino"}
  },
  {
    "type": "text_image",
    "heading": "Maca Peruana e a Libido",
    "text": "A Maca Peruana é frequentemente associada ao aumento da libido em homens e mulheres. Estudos indicam que ela pode melhorar o desejo sexual e a função erétil, tornando-a uma opção natural para aqueles que buscam melhorar sua vida íntima."
  },
  {
    "type": "text_image",
    "heading": "Maca Peruana na menopausa",
    "text": "A menopausa é uma fase natural da vida da mulher, marcada por transformações hormonais que podem trazer sintomas como ondas de calor, insônia, cansaço, queda da libido e mudanças de humor. Esses sinais muitas vezes afetam a qualidade de vida, tornando necessário buscar alternativas naturais que auxiliem nesse processo.\n\nA Maca Peruana tem se destacado como uma opção poderosa e segura para o bem-estar feminino durante essa etapa. Rica em nutrientes essenciais, como vitaminas do complexo B, minerais (zinco, ferro, cálcio e magnésio) e compostos bioativos, a raiz ajuda a equilibrar a produção hormonal de forma natural, sem os efeitos colaterais comuns das terapias hormonais sintéticas.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/4dec8397-85f5-4985-9e7e-db671befe47b/maca-menopausa-desktop.jpg", "alt": "Maca Peruana menopausa"}
  },
  {
    "type": "product_shelf",
    "heading": "Adquira o seu:",
    "products": [
      {"name": "Maca 500mg - 90 Doses", "price": "R$ 66,00", "installments": "5x de R$ 13,20 sem juros", "href": "https://loja.medicinalnaweb.com.br/maca-500mg-90-doses/p?skuId=1103", "image": "https://medicinalnaweb.vteximg.com.br/arquivos/ids/165444/Maca-mockup.png?v=638942353983030000"}
    ]
  }
]'::jsonb),

('campanhas/peptistrong', 'PeptiStrong – Força, Massa Muscular e Recuperação', 'Conheça o PeptiStrong, suplemento indicado para ganho de força, massa muscular e melhor recuperação. Qualidade e confiança na Medicinal na Web.', 'https://assets.decocache.com/medicinal-store/d1335d5d-9874-40ac-b691-54cb41d3315c/Frame-1.svg',
'[
  {
    "type": "hero",
    "heading": "Peptistrong Benefícios e Indicações",
    "description": "Peptídeos bioativos que auxiliam na força muscular e recuperação."
  },
  {
    "type": "benefits_icons",
    "items": [
      {"icon": "https://assets.decocache.com/medicinal-store/cffd7895-7813-4084-9d89-2028ed9b2dc4/muscle-pain_3782533.png", "text": "Reduz a fadiga muscular"},
      {"icon": "https://assets.decocache.com/medicinal-store/c4104a5b-ef56-4a7d-955e-6b54221ff46a/man_16424032.png", "text": "Auxilia na manutenção da massa magra"},
      {"icon": "https://assets.decocache.com/medicinal-store/51a203ad-ee48-4224-928b-8878757eace5/gym_14858659.png", "text": "Favorece a recuperação pós-treino"}
    ]
  },
  {
    "type": "image_text",
    "heading": "Peptistrong",
    "text": "O Peptistrong é um ingrediente inovador desenvolvido a partir de peptídeos bioativos de origem vegetal que atua diretamente no fortalecimento e na manutenção da massa muscular. Diferente das proteínas comuns, ele foi criado com tecnologia avançada para oferecer benefícios específicos, ajudando na recuperação após os treinos, na preservação da força e no apoio à saúde metabólica. Estudos mostram que o Peptistrong contribui para reduzir a degradação muscular e estimular a síntese de proteínas, favorecendo o desempenho físico, a vitalidade e a qualidade de vida em diferentes fases da vida. Por ser uma alternativa vegana e cientificamente validada, tornou-se um aliado importante tanto para atletas e praticantes de atividades físicas que buscam melhor desempenho e recuperação, quanto para pessoas que desejam envelhecer de forma saudável, mantendo força e mobilidade.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/e9316691-86b4-48a5-85b6-8027c6701ea8/peptistrong-lp-desktop.jpg", "alt": "Peptistrong"}
  },
  {
    "type": "image_text",
    "heading": "Peptistrong pra que serve",
    "text": "O PeptiStrong serve para cuidar da saúde muscular, ajudando a manter, recuperar e fortalecer os músculos. Ele estimula a síntese de proteínas, reduz a perda de massa magra, acelera a recuperação após treinos e apoia a vitalidade no dia a dia. É indicado tanto para quem pratica atividades físicas e busca melhor desempenho, quanto para quem deseja preservar força e mobilidade ao longo da vida, sendo uma solução natural, vegana e cientificamente comprovada.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/92a9394e-246d-43b1-ba82-b51365370ab4/peptistrong-aliado-desktop.jpg", "alt": "Peptistrong aliado"}
  },
  {
    "type": "text_image",
    "heading": "Benefícios do Peptistrong",
    "text": "O PeptiStrong é um suplemento inovador formulado com peptídeos bioativos que atuam de forma direta na recuperação e no fortalecimento muscular. Diferente das proteínas tradicionais, ele apresenta uma ação mais rápida e direcionada, ajudando o corpo a se recuperar de treinos intensos e a manter os músculos em pleno funcionamento. Entre seus principais benefícios, está a capacidade de acelerar a recuperação muscular, reduzindo dores e fadiga, o que permite treinar novamente em menos tempo e com mais disposição.\n\nOutro ponto importante é a manutenção da massa magra, já que o PeptiStrong auxilia na preservação dos músculos mesmo em períodos de dieta ou perda de peso, além de contribuir para o ganho de força e resistência, favorecendo a performance durante as atividades físicas. Estudos científicos comprovam que seus peptídeos estimulam a síntese de proteínas musculares de maneira eficaz, garantindo resultados consistentes e visíveis.\n\nCom consumo prático e fácil de incluir na rotina, o PeptiStrong vai além da suplementação comum: ele potencializa sua energia, acelera sua evolução nos treinos e entrega resultados reais para quem busca saúde, performance e um corpo mais forte.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/8be22dbf-9686-4053-ba5f-44d0bed2a914/recuperacao-muscular-desktop.jpg", "alt": "Recuperação muscular"}
  },
  {
    "type": "video_section",
    "videos": [
      {"title": "PeptiStrong na Menopausa", "url": "https://www.youtube.com/shorts/2M-s7RyTqM0", "thumbnail": "https://img.youtube.com/vi/2M-s7RyTqM0/hqdefault.jpg"},
      {"title": "PeptiStrong Substitui Whey", "url": "https://www.youtube.com/shorts/Qxm32X8bsU4", "thumbnail": "https://img.youtube.com/vi/Qxm32X8bsU4/hqdefault.jpg"}
    ]
  },
  {
    "type": "image_text",
    "heading": "Peptistrong ou Whey",
    "text": "O Whey Protein é uma fonte de proteína rápida que ajuda na construção muscular. Já o Peptistrong faz mais do que isso: ele age de forma direta nos músculos, ajudando a reduzir o cansaço, manter a massa magra e acelerar a recuperação depois do treino.\n\nEnquanto o whey apenas alimenta, o Peptistrong estimula seus músculos a reagirem melhor, dando mais força e disposição.\n\nDe origem 100% vegetal, é uma opção natural, vegana e comprovada para quem busca desempenho e saúde muscular todos os dias.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/0624ef7e-d3de-4ad4-aa78-eeaa08d23351/peptistrong-ou-whey-desktop.png", "alt": "Peptistrong ou Whey"}
  },
  {
    "type": "text_image",
    "heading": "PeptiStrong no Combate à Sarcopenia",
    "text": "A sarcopenia é a perda progressiva de massa e força muscular, que pode comprometer a mobilidade, a performance física e a qualidade de vida. O PeptiStrong é um suplemento inovador desenvolvido com peptídeos bioativos que atuam diretamente na recuperação e manutenção dos músculos, estimulando a síntese proteica de forma eficiente.\n\nCom o PeptiStrong, é possível preservar a massa magra, reduzir a fadiga muscular e acelerar a recuperação, mesmo após treinos intensos, períodos de inatividade ou processos de desgaste físico. Sua ação ajuda a fortalecer os músculos, melhorar a resistência e manter o corpo saudável, prevenindo os efeitos da sarcopenia e garantindo mais energia e disposição para as atividades do dia a dia.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/a23aac5f-2e9f-4dc7-92c4-f184f6627ecd/sarcopenia-desktop.jpg", "alt": "Sarcopenia"}
  },
  {
    "type": "product_shelf",
    "heading": "Adquira o seu:",
    "products": [
      {"name": "Peptistrong - Chocolate Belga 300g", "href": "https://loja.medicinalnaweb.com.br/peptistrong-chocolate-belga/p?skuId=50003", "image": "https://medicinalnaweb.vteximg.com.br/arquivos/ids/165393/mockup-peptistrong.jpg?v=638893249034430000"}
    ]
  }
]'::jsonb),

('campanhas/morosil', 'Morosil – Benefícios, Indicações e Como Tomar', 'Descubra os benefícios do Morosil, suas indicações e como pode auxiliar no emagrecimento e controle de medidas. Compre na Medicinal na Web.', 'https://assets.decocache.com/medicinal-store/d1335d5d-9874-40ac-b691-54cb41d3315c/Frame-1.svg',
'[
  {
    "type": "hero",
    "heading": "Morosil Benefícios e Indicações",
    "description": "Esta laranja é cultivada exclusivamente na área em torno do vulcão Etna no leste da Sicília (Itália). A laranja Moro se destaca por sua aparência e coloração vermelha, que é a principal fonte dos pigmentos de antocianidina, um excelente antioxidante."
  },
  {
    "type": "benefits_icons",
    "items": [
      {"icon": "https://assets.decocache.com/medicinal-store/30f473ea-8ff6-418b-a4b8-0cb1514d3e9e/body-contouring_18081919.png", "text": "Reduz a gordura abdominal e corporal"},
      {"icon": "https://assets.decocache.com/medicinal-store/081934b5-f072-4830-b150-a1330714c6ba/scale_4289138.png", "text": "Auxilia no controle do peso"},
      {"icon": "https://assets.decocache.com/medicinal-store/ae5fefdd-05bc-4328-bec2-f8b914adb6dc/flash-sale_8866333.png", "text": "Favorece o metabolismo de gorduras"}
    ]
  },
  {
    "type": "image_text",
    "heading": "Morosil",
    "text": "O Morosil é um ativo natural, extraído da laranja vermelha Moro, cultivada exclusivamente na Sicília, na Itália. Rico em antocianinas, flavonoides e vitamina C, ele oferece um efeito antioxidante poderoso e atua diretamente na redução da gordura corporal, especialmente na região abdominal.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/6a094f93-ac71-44de-96ae-8b4b15b80213/morosil.desktop.jpg", "alt": "Morosil"}
  },
  {
    "type": "image_text",
    "heading": "Morosil Pra que serve?",
    "text": "Morosil tem sido utilizado no cuidado e na prevenção da obesidade, resistência à insulina, esteatose hepática e doenças cardiovasculares. A ação terapêutica do Morosil ocorre porque a Laranja Moro é rica em compostos bioativos, especialmente antocianidinas, flavonoides, ácidos hidroxicinâmicos e ácido ascórbicos",
    "image": {"src": "https://assets.decocache.com/medicinal-store/6d6d4545-6acd-48c5-b373-861c541a80c5/AN-Morosil-02.jpg", "alt": "Morosil pra que serve"}
  },
  {
    "type": "text_image",
    "heading": "Morosil Emagrece?",
    "text": "Os compostos bioativos do Morosil podem contribuir para reduzir a esteatose hepática através do aumento da expressão de genes lipolíticos e redução da expressão de genes lipogênicos no fígado como o LXR e a FAS. Desta forma, ocorre redução na síntese de triacilgliceróis e a oxidação de gordura no fígado. Acredita-se que o grande responsável por esses efeitos benéficos no fígado sejam as antocianididas C3G e seus metabólitos. Outros bioativos presentes no Morosil ampliam esse resutado terapêutico",
    "image": {"src": "https://assets.decocache.com/medicinal-store/e198e9e9-3790-45fe-91da-e15956109c20/mulher-morosil.png", "alt": "Morosil emagrece"}
  },
  {
    "type": "image_text",
    "heading": "Morosil faz perder barriga?",
    "text": "Morosil é um tratamento que auxilia na perda de medidas, especialmente na região abdominal. Seus bioativos atuam melhorando a hipóxia e a inflamação causadas pela hipertrofia dos adipócitos. A ação das antocianidinas, presentes no Morosil, promove a melhora do metabolismo do tecido adiposo, contribuindo por diversos mecanismos para a redução de medidas na região do abdômen. Resultados excelentes são obtidos quando associado a uma alimentação saudável e à prática regular de atividade física.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/24ad19e6-d142-4614-872b-9ca92537cdda/AN-Morosil-04.jpg", "alt": "Morosil barriga"}
  },
  {
    "type": "text_image",
    "heading": "Morosil é enganação?",
    "text": "Morosil é um produto com ação comprovada no metabolismo do tecido adiposo. Sabe-se que a hipertrofia das células de gordura (adipócitos) é um importante fator para a obesidade. Esse aumento do adipócitos causa a hipóxia tecidual, que a esta associada com o desenvolvimento de inflamação e resistência à insulina sistemica. Os compostos bioativos do Morosil, especialmente a antocianidida C3G são capazes de atuar nesse mecanismo, melhorando o metabolismo do tecido adiposo. Os polifenóis tem alto poder antioxidante e atuam na redução dos eventos relacionados à inflamação e estresse oxidativo. A antocianidina C3G também contribui para reduzir o transporte de ácidos graxos e a sua captação pelos adipócitos. Os polifenóis presentes no Morosil contribuem para diminuir a enzima HMG-CoA, que tem papel importante na síntese do coleterol. Desta forma, o uso do Morosil reduz os o colesterol tecidual e aumenta a expressão dos receptores de LDL.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/d3d7ca48-f803-4cc4-86e6-c4de26904cc4/morosil-enganacao-desktop.jpg", "alt": "Morosil enganação"}
  },
  {
    "type": "image_text",
    "heading": "Outros Benefícios do Morosil",
    "text": "Os compostos bioativos do Morosil podem contribuir para reduzir a esteatose hepática através do aumento da expressão de genes lipolíticos e redução da expressão de genes lipogênicos no fígado como o LXR e a FAS. Desta forma, ocorre redução na síntese de triacilgliceróis e a oxidação de gordura no fígado. Acredita-se que o grande responsável por esses efeitos benéficos no fígado sejam as antocianididas C3G e seus metabólitos. Outros bioativos presentes no Morosil ampliam esse resutado terapêutico",
    "image": {"src": "https://assets.decocache.com/medicinal-store/b504e1f5-7b6a-4244-8fc1-2bc2bc461b3d/morosil-figado-desktop.png", "alt": "Morosil fígado"}
  },
  {
    "type": "text_image",
    "heading": "Como tomar Morosil?",
    "text": "O Morosil é um extrato padronizado da Laranja Moro, 100% natural e sem adição de corantes. Pode ser ingerido em cápsulas de 500 mg, na dose de 1 a 4 cápsulas por dia, em qualquer horário, pois não contém cafeína nem substâncias que atrapalham o sono.\n\nA formulação pode ser feita em cápsulas vegetais, tornando o produto vegano, além de ser livre de lactose e glúten.",
    "image": {"src": "https://assets.decocache.com/medicinal-store/9c50da7c-a3bc-452d-8253-a86752e065ef/morosil-comotomar-desktop.jpg", "alt": "Como tomar Morosil"}
  },
  {
    "type": "image_text",
    "heading": "Morosil é aprovado pela ANVISA",
    "text": "O Morosil é um produto que tem diversos estudos que comprovam sua eficácia. É importante reforçar que o Morosil também foi aprovado pela ANVISA para uso em suplementos alimentares, dando a ele a credibilidade e a segurança que todos queremos. Tomar Morosil significa cuidar da nossa saúde. Mais que apenas o apelo estético, Morosil tem ação benéfica para nossa saúde. Francieli Pagliari; Farmacêutica pela Universidade Regional de Blumenau (FURB-SC) 2005; Pós Graduada em Análises Clínicas (CBES-PR); Pós Graduada em PD em Cosméticos (RACINE-SC);",
    "image": {"src": "https://assets.decocache.com/medicinal-store/87b20290-8bef-4f66-bda3-899270c0a8a0/morosil-selo.png", "alt": "Morosil selo ANVISA"}
  },
  {
    "type": "product_shelf",
    "heading": "Adquira o seu:",
    "products": [
      {"name": "Morosil 500mg - 60 Doses", "href": "https://loja.medicinalnaweb.com.br/morosil-500mg-60-doses/p?skuId=1015", "image": "https://medicinalnaweb.vteximg.com.br/arquivos/ids/165433/Morosil-500mg.jpg?v=638926022710430000"}
    ]
  }
]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  og_image = EXCLUDED.og_image,
  sections = EXCLUDED.sections,
  updated_at = now();
