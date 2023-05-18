use crate::card_handler::CardsHandleType;
use crate::card_handler::Character;
use crate::drop::ocr;
use image::DynamicImage;
use leptess::LepTess;
use leptess::Variable;
use tokio::sync::mpsc;
use tokio::sync::mpsc::Sender;
use tokio::sync::oneshot;

static CORDS_GEN: &[&[u32]] = &[
    &[26, 456, 285, 27],
    &[26, 485, 285, 27],
    &[379, 456, 285, 27],
    &[379, 485, 285, 27],
    &[51, 426, 108, 27],
    &[403, 426, 108, 27],
];

pub async fn series_ocr_loop(
    mut series_receiver: mpsc::Receiver<(DynamicImage, oneshot::Sender<Vec<Character>>)>,
    init_sender: Sender<bool>,
    card_handler_sender: mpsc::Sender<CardsHandleType>,
) {
    let mut workers: Vec<LepTess> = vec![];
    for _ in 0..6 {
        let mut worker = LepTess::new(None, "eng").unwrap();
        worker
            .set_variable(Variable::TesseditPagesegMode, "7")
            .unwrap();
        workers.push(worker)
    }
    init_sender.send(true).await.unwrap();
    loop {
        let (im, return_sender) = series_receiver.recv().await.unwrap();
        let output = ocr(&mut workers, &im, CORDS_GEN);
        let mut characters = vec![];
        for i in 0..2 {
            characters.push(Character {
                name: output.get(i * 2).unwrap().to_owned(),
                series: output.get(i * 2 + 1).unwrap().to_owned(),
                gen: Some(output.get(4 + i * 2 / 2).unwrap().to_owned()),
                wl: None,
            });
        }
        let card_handler_sender_sub = card_handler_sender.clone();
        tokio::spawn(async move {
            card_handler_sender_sub
                .send(CardsHandleType::FindCard(characters, return_sender))
                .await
        });
    }
}
