use captcha::captcha_ocr_loop;
use card_handler::{card_handler_loop, CardsHandleType, Character};
use drop::drop_ocr_loop;
use image::{DynamicImage, ImageFormat};
use napi_derive::napi;
use series_handler::{series_handler_loop, Series, SeriesHandleType};
use tokio;
use tokio::sync::mpsc;
mod drop;
use tokio::sync::mpsc::Sender;
use tokio::sync::oneshot;
mod captcha;
mod card_handler;
mod series_handler;

#[napi]
pub struct RustBridge {
    drop_sender: Sender<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    captcha_sender: Sender<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    card_sender: Sender<CardsHandleType>,
    series_sender: Sender<SeriesHandleType>,
}

#[napi]
impl RustBridge {
    #[napi(constructor)]
    pub fn new() -> Self {
        let (drop_sender, drop_receiver) = mpsc::channel(1);
        let (captcha_sender, captcha_receiver) = mpsc::channel(1);
        let (card_sender, card_receiver) = mpsc::channel(1);
        let (series_sender, series_receiver) = mpsc::channel(1);
        let (init_sender, mut init_receiver) = mpsc::channel(1);
        tokio::spawn(card_handler_loop(card_receiver, init_sender.clone()));
        tokio::spawn(series_handler_loop(series_receiver, init_sender.clone()));
        tokio::spawn(drop_ocr_loop(
            drop_receiver,
            init_sender.clone(),
            card_sender.clone(),
        ));
        tokio::spawn(captcha_ocr_loop(
            captcha_receiver,
            init_sender,
            card_sender.clone(),
        ));
        for _ in 0..4 {
            init_receiver.blocking_recv();
        }
        RustBridge {
            drop_sender,
            captcha_sender,
            card_sender,
            series_sender,
        }
    }

    #[napi]
    pub async fn ocr_drop(&self, url: String) -> Vec<Character> {
        let (return_sender, return_receiver) = oneshot::channel();
        let bytes = reqwest::get(url).await.unwrap().bytes().await.unwrap();
        let im = image::load_from_memory_with_format(&bytes, ImageFormat::WebP).unwrap();
        drop(bytes);
        self.drop_sender.send((im, return_sender)).await.unwrap();
        return_receiver.await.unwrap()
    }

    #[napi]
    pub async fn ocr_captcha(&self, url: String) -> Vec<Character> {
        let (return_sender, return_receiver) = oneshot::channel();
        let bytes = reqwest::get(url).await.unwrap().bytes().await.unwrap();
        let im = image::load_from_memory(&bytes).unwrap();
        drop(bytes);
        self.captcha_sender.send((im, return_sender)).await.unwrap();
        return_receiver.await.unwrap()
    }

    #[napi]
    pub async fn find_cards(&self, characters: Vec<Character>) -> Vec<Character> {
        let (return_sender, return_receiver) = oneshot::channel();
        self.card_sender
            .send(CardsHandleType::FindCard(characters, return_sender))
            .await
            .unwrap();
        return_receiver.await.unwrap()
    }

    #[napi]
    pub async fn find_series(&self, series: Vec<Series>) -> Vec<Series> {
        let (return_sender, return_receiver) = oneshot::channel();
        self.series_sender
            .send(SeriesHandleType::FindSeries(series, return_sender))
            .await
            .unwrap();
        return_receiver.await.unwrap()
    }

    #[napi]
    pub async fn update_card(&self, card: Character) {
        self.card_sender
            .send(CardsHandleType::UpdateCard(card))
            .await
            .unwrap();
    }

    #[napi]
    pub async fn update_series(&self, series: Series) {
        self.series_sender
            .send(SeriesHandleType::UpdateSeries(series))
            .await
            .unwrap();
    }
}
