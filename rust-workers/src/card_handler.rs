use mongodb::bson::{doc, Document};
use mongodb::options::{ClientOptions, UpdateOptions};
use mongodb::{Client, Database};
use napi_derive::napi;
use rayon::iter::ParallelIterator;
use rayon::prelude::{IntoParallelIterator, IntoParallelRefIterator, IntoParallelRefMutIterator};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc::{Receiver, Sender};
use tokio::sync::oneshot;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[napi(object)]
pub struct Character {
    pub name: String,
    pub series: String,
    pub gen: Option<String>,
    pub wl: Option<u32>,
}

#[derive(Debug)]
pub enum CardsHandleType {
    FindCard(Vec<Character>, oneshot::Sender<Vec<Character>>),
    UpdateCard(Character),
}

#[allow(unreachable_code)]
pub async fn card_handler_loop(mut receiver: Receiver<CardsHandleType>, init_sender: Sender<bool>) {
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
    let collection = db.collection::<Character>("analysis_characters");
    let mut cursor = collection.find(None, None).await.unwrap();
    let mut characters = vec![];
    while cursor.advance().await.unwrap() {
        let character = cursor.deserialize_current().unwrap();
        characters.push(character);
    }
    init_sender.send(true).await.unwrap();
    loop {
        match receiver.recv().await.unwrap() {
            CardsHandleType::FindCard(cards, return_sender) => {
                let found = (0..cards.len())
                    .into_par_iter()
                    .map(|i| {
                        let card = &cards[i];
                        let (is_dot_name, card_name) = format_string(card.name.clone());
                        let (is_dot_series, card_series) = format_string(card.series.clone());
                        match characters.par_iter().find_any(|character| {
                            check_match(&character.name, &card_name, &is_dot_name)
                                && check_match(&character.series, &card_series, &is_dot_series)
                        }) {
                            None => card.to_owned(),
                            Some(found_card) => {
                                let mut return_card = card.clone();
                                return_card.wl = found_card.wl.clone();
                                return_card
                            }
                        }
                    })
                    .collect::<Vec<Character>>();
                return_sender.send(found).unwrap();
            }
            CardsHandleType::UpdateCard(card) => {
                let (is_dot_name, card_name) = format_string_lite(&card.name);
                let (is_dot_series, card_series) = format_string_lite(&card.series);
                match characters.par_iter_mut().find_any(|character| {
                    check_equal(&character.name, &card_name, &is_dot_name)
                        && check_equal(&character.series, &card_series, &is_dot_series)
                }) {
                    None => {
                        if (!is_dot_name) && (!is_dot_series) {
                            let mut m_card = card.clone();
                            m_card.name = card_name;
                            m_card.series = card_series;
                            characters.push(m_card.clone());
                            tokio::spawn(update_card(db.clone(), m_card.clone()));
                        }
                    }
                    Some(found_card) => {
                        found_card.wl = card.wl.clone();
                        tokio::spawn(update_card(db.clone(), found_card.clone()));
                    }
                }
            }
        }
    }
}

async fn update_card(database: Database, card: Character) {
    database
        .collection::<Document>("analysis_characters")
        .update_one(
            doc! {
                "name": &card.name,
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

fn format_string(mut string: String) -> (bool, String) {
    string = string
        .chars()
        .filter(|&c| c.is_ascii_alphanumeric() || c == '.')
        .collect();
    if string.ends_with("....") {
        string = string.replace("....", "...");
    }
    if string.ends_with("..") && string.chars().nth(string.len() - 3).unwrap() != '.' {
        string += ".";
    }
    let is_dot = string.ends_with("...");
    (is_dot, string.replace("...", "").to_ascii_lowercase())
}

fn format_string_lite(string: &str) -> (bool, String) {
    (
        string.ends_with("..."),
        string
            .chars()
            .filter(|&c| c.is_ascii_alphanumeric() || c == '.')
            .map(|c| c.to_ascii_lowercase())
            .collect::<String>()
            .replace("...", ""),
    )
}

fn check_match(character: &String, card: &String, is_dot: &bool) -> bool {
    if check_equal(character, card, is_dot) {
        true
    } else {
        let mut diffs = 0;
        let mut diff_chars: [char; 2] = ['.', '.'];
        let mut character_mut = character.to_owned();
        let mut card_mut = card.to_owned();
        let mut index = 0;
        for (c1, c2) in character.chars().zip(card.chars()) {
            if c1 != c2 {
                diffs += 1;
                if diffs > 1 {
                    return false;
                }
                diff_chars = [c1, c2];
                if !BALANCERS.iter().any(|balancer| {
                    balancer
                        .iter()
                        .all(|balancer_char| diff_chars.contains(balancer_char))
                }) {
                    return false;
                }
                character_mut.remove(index);
                card_mut.remove(index);
            }
            index += 1;
        }
        check_equal(&character_mut, &card_mut, is_dot)
    }
}

fn check_equal(character: &String, card: &String, is_dot: &bool) -> bool {
    if *is_dot {
        character.starts_with(card)
    } else {
        character == card
    }
}

static BALANCERS: &[&[char]] = &[
    &['|'],
    &['’'],
    &['o', '0'],
    &['l', 'i'],
    &['1', ']'],
    &['y', 'v'],
    &['$', 's'],
    &['i', '!'],
    &['s', '5'],
    &['©', 'o'],
    &['1', 'i'],
    &['a', 'é'],
    &['.', '-'],
];
