use captcha::captcha_ocr_loop;
use card_handler::{card_handler_loop, CardsHandleType, Character};
use drop::drop_ocr_loop;
use engine2::{engine_loop, CharacterData, EngineHandleType};
use image::DynamicImage;
use napi_derive::napi;
use series_handler::{series_handler_loop, Series, SeriesHandleType};
use series_ocr::series_ocr_loop;
use tokio;
use tokio::sync::mpsc;
mod drop;
use tokio::sync::mpsc::Sender;
use tokio::sync::oneshot;
mod captcha;
mod card_handler;
mod engine2;
mod series_handler;
mod series_ocr;

#[napi]
pub struct RustBridge {
    drop_sender: Sender<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    captcha_sender: Sender<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    card_sender: Sender<CardsHandleType>,
    series_sender: Sender<SeriesHandleType>,
    series_ocr_sender: Sender<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    engine_sender: Sender<EngineHandleType>,
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
        let (series_ocr_sender, series_ocr_receiver) = mpsc::channel(1);
        let (engine_sender, engine_receiver) = mpsc::channel(1);
        tokio::spawn(card_handler_loop(card_receiver, init_sender.clone()));
        tokio::spawn(series_handler_loop(series_receiver, init_sender.clone()));
        tokio::spawn(drop_ocr_loop(
            drop_receiver,
            init_sender.clone(),
            card_sender.clone(),
        ));
        tokio::spawn(captcha_ocr_loop(
            captcha_receiver,
            init_sender.clone(),
            card_sender.clone(),
        ));
        tokio::spawn(series_ocr_loop(
            series_ocr_receiver,
            init_sender.clone(),
            card_sender.clone(),
        ));
        tokio::spawn(engine_loop(engine_receiver, init_sender));
        for _ in 0..6 {
            init_receiver.blocking_recv();
        }
        RustBridge {
            drop_sender,
            captcha_sender,
            card_sender,
            series_sender,
            series_ocr_sender,
            engine_sender,
        }
    }

    #[napi]
    pub async fn ocr_drop(&self, url: String) -> Vec<Character> {
        download_and_ocr(&self.drop_sender, url).await
    }

    #[napi]
    pub async fn ocr_captcha(&self, url: String) -> Vec<Character> {
        download_and_ocr(&self.captcha_sender, url).await
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

    #[napi]
    pub async fn ocr_series(&self, url: String) -> Vec<Character> {
        download_and_ocr(&self.series_ocr_sender, url).await
    }

    #[napi]
    pub async fn update_character_data(&self, data: CharacterData) {
        let _ = &self
            .engine_sender
            .send(EngineHandleType::UpdateData(CharacterData {
                name: data.name,
                series: data.series,
                category: data.category,
                wl: data.wl,
                generated: data.generated,
                burned: data.burned,
                threed: data.threed,
                _id: data._id,
            }))
            .await
            .ok();
    }
}

async fn download_and_ocr(
    sender: &Sender<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    url: String,
) -> Vec<Character> {
    let (return_sender, return_receiver) = oneshot::channel();
    let im = download(url).await;
    sender.send((im, return_sender)).await.unwrap();
    return_receiver.await.unwrap()
}

async fn download(url: String) -> DynamicImage {
    let bytes = reqwest::get(url).await.unwrap().bytes().await.unwrap();
    image::load_from_memory(&bytes).unwrap()
}
