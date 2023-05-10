use captcha::captcha_ocr_loop;
use card_handler::{card_handler_loop, CardsHandleType, Character};
use drop::drop_ocr_loop;
use image::{DynamicImage, ImageFormat};
use node_bridge::NodeBridge;
use series_handler::{series_handler_loop, Series, SeriesHandleType};
use tokio::sync::mpsc;
mod drop;
use tokio::sync::mpsc::Sender;
use tokio::sync::oneshot;
mod captcha;
mod card_handler;
mod series_handler;

#[tokio::main]
async fn main() {
    let bridge = NodeBridge::new();
    let (drop_sender, drop_receiver) = mpsc::channel(1);
    let (captcha_sender, captcha_receiver) = mpsc::channel(1);
    let (card_sender, card_receiver) = mpsc::channel(1);
    let (series_sender, series_receiver) = mpsc::channel(1);
    bridge.register_async("ocr_drop", ocr_drop, Some(drop_sender));
    bridge.register_async("find_cards", find_cards, Some(card_sender.clone()));
    bridge.register_async("find_series", find_series, Some(series_sender.clone()));
    bridge.register_async("ocr_captcha", ocr_captcha, Some(captcha_sender));
    tokio::spawn(card_handler_loop(card_receiver, bridge.clone()));
    tokio::spawn(series_handler_loop(series_receiver, bridge.clone()));
    tokio::spawn(update_card_loop(card_sender.clone(), bridge.clone()));
    tokio::spawn(update_series_loop(series_sender.clone(), bridge.clone()));
    tokio::spawn(drop_ocr_loop(
        drop_receiver,
        bridge.clone(),
        card_sender.clone(),
    ));
    tokio::spawn(captcha_ocr_loop(
        captcha_receiver,
        bridge.clone(),
        card_sender,
    ));
    bridge.wait_until_closes().await;
}

async fn ocr_drop(
    params: Vec<String>,
    sender: Option<Sender<(DynamicImage, oneshot::Sender<String>)>>,
) -> String {
    let (return_sender, return_receiver) = oneshot::channel();
    let bytes = reqwest::get(params.get(0).unwrap())
        .await
        .unwrap()
        .bytes()
        .await
        .unwrap();
    let im = image::load_from_memory_with_format(&bytes, ImageFormat::WebP).unwrap();
    drop(bytes);
    sender.unwrap().send((im, return_sender)).await.unwrap();
    return_receiver.await.unwrap()
}

async fn ocr_captcha(
    params: Vec<String>,
    sender: Option<Sender<(DynamicImage, oneshot::Sender<String>)>>,
) -> String {
    let (return_sender, return_receiver) = oneshot::channel();
    let bytes = reqwest::get(params.get(0).unwrap())
        .await
        .unwrap()
        .bytes()
        .await
        .unwrap();
    let im = image::load_from_memory(&bytes).unwrap();
    drop(bytes);
    sender.unwrap().send((im, return_sender)).await.unwrap();
    return_receiver.await.unwrap()
}

#[allow(unreachable_code)]
async fn update_card_loop(sender: Sender<CardsHandleType>, bridge: NodeBridge) {
    loop {
        let card: Character =
            serde_json::from_str(bridge.receive("update_card").await.unwrap().as_str()).unwrap();
        sender
            .send(CardsHandleType::UpdateCard(card))
            .await
            .unwrap();
    }
    bridge.close().await;
}

#[allow(unreachable_code)]
async fn update_series_loop(sender: Sender<SeriesHandleType>, bridge: NodeBridge) {
    loop {
        let card: Series =
            serde_json::from_str(bridge.receive("update_series").await.unwrap().as_str()).unwrap();
        sender
            .send(SeriesHandleType::UpdateSeries(card))
            .await
            .unwrap();
    }
    bridge.close().await;
}

async fn find_cards(params: Vec<String>, sender: Option<Sender<CardsHandleType>>) -> String {
    let characters: Vec<Character> = serde_json::from_str(params[0].as_str()).unwrap();
    let (return_sender, return_receiver) = oneshot::channel();
    sender
        .unwrap()
        .send(CardsHandleType::FindCard(characters, return_sender))
        .await
        .unwrap();
    return_receiver.await.unwrap()
}

async fn find_series(params: Vec<String>, sender: Option<Sender<SeriesHandleType>>) -> String {
    let series: Vec<Series> = serde_json::from_str(params[0].as_str()).unwrap();
    let (return_sender, return_receiver) = oneshot::channel();
    sender
        .unwrap()
        .send(SeriesHandleType::FindSeries(series, return_sender))
        .await
        .unwrap();
    return_receiver.await.unwrap()
}
