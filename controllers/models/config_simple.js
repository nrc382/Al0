module.exports = {
    token: '', // token bot telegram
    router: "", // router sul server per le post di telegram
    server_port: -1, // porta del server

    creatore_id: -1,  // id telegram con PRIVILEGI;
    niko_id: -1, // id telegram con PRIVILEGI su Figurine;
    edicola_id: "", // id per il gruppo dell'edicola

    databaseHost: "",  // database host
    databasePsw: "", // ...

    //Argonauti
    databaseArgonaut: "", // Db per ArgonautiController (e model)

    //Incarichi
    databaseIncarichi: "",  // Db per IncarichiController (e model)

    
    //Suggerimenti
    phenix_id: -1,  // id telegram con PRIVILEGI su Suggerimenti;
    sugg_antifloodTime: 1, // ...
    LootSuggChannel: "", // Id canale Suggerimenti
    LootAvvisiChannel: "",  // Id canale Avvisi

    databaseLootUser: "", // Tabella User ...
    databaseSuggName: "" // Tabella per Suggerimenti ...
}
