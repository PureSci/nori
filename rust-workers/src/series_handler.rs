use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, UpdateOptions},
    Client, Database,
};
use node_bridge::NodeBridge;
use rayon::prelude::*;
use tokio::sync::{mpsc::Receiver, oneshot};

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Series {
    pub name: String,
    pub wl: Option<u32>,
}

#[derive(Debug)]
pub enum SeriesHandleType {
    FindSeries(Vec<Series>, oneshot::Sender<String>),
    UpdateSeries(Series),
}

#[allow(unreachable_code)]
pub async fn series_handler_loop(mut receiver: Receiver<SeriesHandleType>, bridge: NodeBridge) {
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
    let collection = db.collection::<Series>("analysis_series");
    let mut cursor = collection.find(None, None).await.unwrap();
    let mut series = vec![];
    while cursor.advance().await.unwrap() {
        series.push(cursor.deserialize_current().unwrap());
    }
    bridge.send("init", true).unwrap();
    loop {
        //let (cards, return_sender) = receiver.recv().await.unwrap();
        match receiver.recv().await.unwrap() {
            SeriesHandleType::FindSeries(cards, return_sender) => {
                let found = (0..3)
                    .into_par_iter()
                    .map(|i| {
                        let card = &cards[i].name;
                        //card.retain(|c| !c.is_whitespace());
                        let is_dot_card = card.ends_with("...");
                        match series.par_iter().find_any(|serie| {
                            let is_dot_serie = serie.name.ends_with("...");
                            if is_dot_serie && is_dot_card {
                                if serie.name.len() > card.len() {
                                    return serie.name.starts_with(card);
                                } else {
                                    return card.starts_with(&serie.name);
                                }
                            } else if is_dot_serie && !is_dot_card {
                                return card.starts_with(&serie.name);
                            } else if (!is_dot_serie) && is_dot_card {
                                return serie.name.starts_with(card);
                            } else {
                                return &serie.name == card;
                            }
                        }) {
                            None => cards[i].clone(),
                            Some(found) => found.to_owned(),
                        }
                    })
                    .collect::<Vec<Series>>();
                let mut return_str = "[".to_string();
                for item in found.iter().take(3) {
                    let wl = match &item.wl {
                        Some(wishlist) => wishlist.to_string(),
                        None => "0".to_string(),
                    };
                    return_str
                        .push_str(&format!(r#"{{"series":"{}", "wl": "{}"}},"#, item.name, wl,));
                }
                return_str.pop();
                return_str.push(']');
                return_sender.send(return_str).unwrap();
            }
            SeriesHandleType::UpdateSeries(cardo) => {
                let card = &cardo.name;
                let is_dot_card = card.ends_with("...");
                match series.par_iter_mut().find_any(|serie| {
                    let is_dot_serie = serie.name.ends_with("...");
                    if is_dot_serie && is_dot_card {
                        if serie.name.len() > card.len() {
                            return serie.name.starts_with(card);
                        } else {
                            return card.starts_with(&serie.name);
                        }
                    } else if is_dot_serie && !is_dot_card {
                        return card.starts_with(&serie.name);
                    } else if (!is_dot_serie) && is_dot_card {
                        return serie.name.starts_with(card);
                    } else {
                        return &serie.name == card;
                    }
                }) {
                    None => {
                        if !is_dot_card {
                            series.push(cardo.clone());
                            tokio::spawn(update_series(db.clone(), cardo.clone()));
                        }
                    }
                    Some(found_series) => {
                        found_series.wl = cardo.wl;
                        tokio::spawn(update_series(db.clone(), found_series.clone()));
                    }
                };
            }
        }
    }
    bridge.close().await;
}

async fn update_series(database: Database, card: Series) {
    database
        .collection::<Document>("analysis_series")
        .update_one(
            doc! {
                "name": &card.name
            },
            doc! {
                "$set": {
                    "wl": &card.wl.as_ref().unwrap()
            }
            },
            UpdateOptions::builder().upsert(true).build(),
        )
        .await
        .unwrap();
}
