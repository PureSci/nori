use mongodb::bson::doc;
use mongodb::options::{ClientOptions, UpdateOptions};
use mongodb::{Client, Collection};
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc::{Receiver, Sender};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[napi(object)]
pub struct CharacterData {
    pub name: String,
    pub series: String,
    pub category: String,
    pub wl: u32,
    pub generated: u32,
    pub burned: u32,
    pub threed: u32,
    pub _id: String,
}

#[derive(Debug)]
pub enum EngineHandleType {
    UpdateData(CharacterData),
}

pub async fn engine_loop(mut receiver: Receiver<EngineHandleType>, init_sender: Sender<bool>) {
    let db_url = std::env::var("MONGODB_URL").unwrap();
    let db = Client::with_options(ClientOptions::parse(db_url.clone()).await.unwrap())
        .unwrap()
        .database(
            db_url
                .split('/')
                .last()
                .unwrap_or_default()
                .split('?')
                .next()
                .unwrap_or_default(),
        );
    let collection = db.collection::<CharacterData>("character_data");
    init_sender.send(true).await.unwrap();
    loop {
        match receiver.recv().await.unwrap() {
            EngineHandleType::UpdateData(character) => {
                tokio::spawn(update_character_data(collection.clone(), character.clone()));
            }
        }
    }
}

async fn update_character_data(collection: Collection<CharacterData>, character: CharacterData) {
    collection
        .update_one(
            doc! {
                "_id": character._id
            },
            doc! {
                "$set": {
                    "name": character.name,
                "series": character.series,
                "category": character.category,
                "wl": character.wl,
                "generated": character.generated,
                "burned": character.burned,
                "threed": character.threed
                }
            },
            UpdateOptions::builder().upsert(true).build(),
        )
        .await
        .ok();
}
