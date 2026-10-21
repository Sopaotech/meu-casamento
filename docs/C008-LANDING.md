# Landing page C-008 e C-008B — fotografia do hero

Na missão C-008, a fotografia `noivara-casal.webp` foi restrita à demonstração local porque a autorização de uso ainda não havia sido documentada. Na C-008B, o proprietário declarou possuir autorização para usar a fotografia original na Noivara e solicitou sua preparação como ativo estático versionável. Esta informação registra a declaração do proprietário; não foram informados autoria, fonte ou termos específicos de licença.

Na missão C-011E, o proprietário confirmou a autorização para uso comercial dessa fotografia original na marca **Meu Casamento** e para sua inclusão em um repositório GitHub privado. Esta é uma confirmação do proprietário; ela não especifica autoria, fonte ou termos de licença.

A fotografia foi copiada sem reprocessamento para `public/images/noivara-casal.webp`, utilizada pelo hero e disponível para inclusão no Git. A cópia privada original permanece em `.local-media/c008-landing/noivara-casal.webp`, diretório ignorado pelo Git; os hashes das duas cópias coincidem. Fotografias enviadas pelos noivos continuam seguindo o armazenamento privado da aplicação.

A rota legada `/demonstracao-local/foto-hero` continua restrita ao desenvolvimento e a hosts locais, mas a landing agora usa o ativo estático. O comando `npm run dev` vincula o servidor a `127.0.0.1`; mantenha essa vinculação para a rota legada e não a exponha por proxy ou rede, pois o cabeçalho Host, por si só, não comprova a origem de uma requisição. O diretório privado continua excluído dos traces do Next.

SHA-256 do original preservado: `48688905aec7c8f32f1559969d1ab18255eb15816cbd1d97ff879edd7810fc24`.
