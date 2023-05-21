use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, UpdateOptions},
    Client, Database,
};
use napi_derive::napi;
use rayon::prelude::*;
use tokio::sync::{
    mpsc::{Receiver, Sender},
    oneshot,
};

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[napi(object)]
pub struct Series {
    pub series: String,
    pub wl: Option<u32>,
}

#[derive(Debug)]
pub enum SeriesHandleType {
    FindSeries(Vec<Series>, oneshot::Sender<Vec<Series>>),
    UpdateSeries(Series),
}

#[allow(unreachable_code)]
pub async fn series_handler_loop(
    mut receiver: Receiver<SeriesHandleType>,
    init_sender: Sender<bool>,
) {
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
    init_sender.send(true).await.unwrap();
    loop {
        //let (cards, return_sender) = receiver.recv().await.unwrap();
        match receiver.recv().await.unwrap() {
            SeriesHandleType::FindSeries(cards, return_sender) => {
                let found = (0..3)
                    .into_par_iter()
                    .map(|i| {
                        let card = &cards[i].series;
                        //card.retain(|c| !c.is_whitespace());
                        let is_dot_card = card.ends_with("...");
                        match series.par_iter().find_any(|serie| {
                            let is_dot_serie = serie.series.ends_with("...");
                            if is_dot_serie && is_dot_card {
                                if serie.series.len() > card.len() {
                                    return serie.series.starts_with(card);
                                } else {
                                    return card.starts_with(&serie.series);
                                }
                            } else if is_dot_serie && !is_dot_card {
                                return card.starts_with(&serie.series);
                            } else if (!is_dot_serie) && is_dot_card {
                                return serie.series.starts_with(card);
                            } else {
                                return &serie.series == card;
                            }
                        }) {
                            None => cards[i].clone(),
                            Some(found) => found.to_owned(),
                        }
                    })
                    .collect::<Vec<Series>>();
                return_sender.send(found).unwrap();
            }
            SeriesHandleType::UpdateSeries(cardo) => {
                let card = &cardo.series;
                let is_dot_card = card.ends_with("...");
                match series.par_iter_mut().find_any(|serie| {
                    let is_dot_serie = serie.series.ends_with("...");
                    if is_dot_serie && is_dot_card {
                        if serie.series.len() > card.len() {
                            return serie.series.starts_with(card);
                        } else {
                            return card.starts_with(&serie.series);
                        }
                    } else if is_dot_serie && !is_dot_card {
                        return card.starts_with(&serie.series);
                    } else if (!is_dot_serie) && is_dot_card {
                        return serie.series.starts_with(card);
                    } else {
                        return &serie.series == card;
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
}

async fn update_series(database: Database, card: Series) {
    database
        .collection::<Document>("analysis_series")
        .update_one(
            doc! {
                "series": &card.series
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
