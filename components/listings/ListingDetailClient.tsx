"use client";

import { useState } from "react";
import ListingDetailPriceBox from "./ListingDetailPriceBox";
import BuyNowModal from "./BuyNowModal";

type Pharmacy = {
  id: string;
  name: string;
  suburb: string;
  state: string;
  rating: number;
  reviewCount: number;
  tradeCount: number;
  createdAt: string;
  isVerified: boolean;
  stripeAccountId?: string | null;
};

type Listing = {
  id: string;
  productName: string;
  pricePerPack: number;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  packSize?: number;
  isActive: boolean;
  fulfillmentType: string;
  deliveryFee?: number;
  pharmacyId: string;
  pharmacy: Pharmacy;
  isGstFree?: boolean | null;
};

type Props = {
  listing: Listing;
  session: { user: { id: string; isVerified?: boolean } } | null;
  /** Agreed price for this buyer when their offer was accepted (only set for that buyer). */
  acceptedPricePerPack?: number;
};

export default function ListingDetailClient({ listing, session, acceptedPricePerPack }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);

  const openBuyModal = (quantity: number) => {
    setModalQuantity(quantity);
    setModalOpen(true);
  };

  return (
    <>
      <ListingDetailPriceBox
        listing={listing}
        session={session}
        onBuyNow={openBuyModal}
        acceptedPricePerPack={acceptedPricePerPack}
      />
      {modalOpen && (
        <BuyNowModal
          listing={listing}
          quantity={modalQuantity}
          onClose={() => setModalOpen(false)}
          acceptedPricePerPack={acceptedPricePerPack}
        />
      )}
    </>
  );
}
