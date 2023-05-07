use card_handler::{card_handler_loop, CardsHandleType, Character};
use drop::drop_ocr_loop;
use image::{DynamicImage, ImageFormat};
use node_bridge::NodeBridge;
use tokio::sync::mpsc;
mod drop;
use tokio::sync::mpsc::Sender;
use tokio::sync::oneshot;
mod card_handler;

#[tokio::main]
async fn main() {
    let bridge = NodeBridge::new();
    let (drop_sender, drop_receiver) = mpsc::channel(1);
    let (card_sender, card_receiver) = mpsc::channel(1);
    bridge.register_async("ocr_drop", ocr_drop, Some(drop_sender));
    tokio::spawn(card_handler_loop(card_receiver, bridge.clone()));
    tokio::spawn(update_card_loop(card_sender.clone(), bridge.clone()));
    tokio::spawn(drop_ocr_loop(drop_receiver, bridge.clone(), card_sender));
    bridge.wait_until_closes().await;
}

async fn ocr_drop(
    params: Vec<String>,
    sender: Option<Sender<(DynamicImage, bool, oneshot::Sender<String>)>>,
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
    //im = im.adjust_contrast(-3.0);
    sender
        .unwrap()
        .send((im, true, return_sender))
        .await
        .unwrap();
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
