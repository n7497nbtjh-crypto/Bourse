# Publier le connecteur dans les annuaires (à faire par Romain)

Le site ne publie rien lui-même : chaque inscription se fait avec votre compte.

1. **Registre officiel MCP** (registry.modelcontextprotocol.io, maintenu par Anthropic, GitHub, Microsoft et PulseMCP) :
   - installer l'outil `mcp-publisher` (instructions sur modelcontextprotocol.io/registry) ;
   - dans ce dossier `mcp/` : `mcp-publisher login github` (votre compte GitHub n7497nbtjh-crypto), puis `mcp-publisher publish` ;
   - le fichier `server.json` est prêt : nom `io.github.n7497nbtjh-crypto/bilan`, adresse `https://repere-bourse.pages.dev/mcp`.
   - Plus tard, avec un nom de domaine à vous, le nom pourra devenir `com.votredomaine/bilan`.
2. **Annuaires communautaires** (gratuits, formulaire en ligne) : PulseMCP, mcp.so, Glama, Smithery. Même description que `server.json`.
3. **Annuaire des connecteurs de Claude et applications de ChatGPT** : formulaires de soumission des éditeurs (conditions à relire au moment de soumettre).

Texte court proposé : « bilan. : les comptes officiels de 2 400 entreprises cotées, chaque chiffre relié à son rapport. Votre IA cite la source au lieu d'inventer. »
