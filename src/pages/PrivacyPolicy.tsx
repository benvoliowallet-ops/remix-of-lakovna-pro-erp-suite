import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-8 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Späť
        </Button>

        <h1 className="mb-2 text-3xl font-bold text-foreground">Ochrana osobných údajov</h1>
        <p className="mb-10 text-muted-foreground">Posledná aktualizácia: marec 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="mb-3 text-lg font-semibold">1. Prevádzkovateľ</h2>
            <p className="text-muted-foreground">
              Prevádzkovateľom aplikácie Lakovňa PRO je spoločnosť <strong className="text-foreground">VORA s.r.o.</strong>,
              so sídlom na území Slovenskej republiky.
            </p>
            <p className="mt-2 text-muted-foreground">
              Kontaktný email:{' '}
              <a href="mailto:adam.halasz@sanfog.com" className="text-primary underline-offset-4 hover:underline">
                adam.halasz@sanfog.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">2. Aké údaje spracúvame</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Registračné údaje: emailová adresa, meno a priezvisko</li>
              <li>Údaje o zákazkách vašej lakovne (objednávky, položky, ceny)</li>
              <li>Údaje o zákazníkoch vašej lakovne (meno, kontakt, adresa)</li>
              <li>Prevádzkové záznamy (výroba, spotreba farby)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">3. Účel spracovania</h2>
            <p className="text-muted-foreground">
              Osobné údaje spracúvame výlučne za účelom prevádzky ERP systému <strong className="text-foreground">Lakovňa PRO</strong> —
              evidencie zákaziek, správy skladu a fakturácie. Údaje nie sú predávané tretím stranám
              ani používané na reklamné účely.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">4. Uchovávanie údajov</h2>
            <p className="text-muted-foreground">
              Všetky dáta sú uložené na serveroch v Európskej únii (Supabase, Frankfurt region, Nemecko).
              Dáta uchovávame po dobu trvania zmluvného vzťahu a ďalšie 3 roky po jeho skončení,
              pokiaľ zákon nevyžaduje inak.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">5. Vaše práva</h2>
            <p className="mb-2 text-muted-foreground">V súlade s GDPR máte právo:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Na prístup k svojim osobným údajom</li>
              <li>Na opravu nesprávnych údajov</li>
              <li>Na výmaz údajov (právo byť zabudnutý)</li>
              <li>Na prenosnosť údajov (export)</li>
              <li>Namietať proti spracúvaniu</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Žiadosti zasielajte na:{' '}
              <a href="mailto:adam.halasz@sanfog.com" className="text-primary underline-offset-4 hover:underline">
                adam.halasz@sanfog.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">6. Cookies</h2>
            <p className="text-muted-foreground">
              Aplikácia používa výlučne nevyhnutné technické cookies (autentifikačný token, nastavenia relácie).
              Nepoužívame reklamné, analytické ani sledovacie cookies tretích strán.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
